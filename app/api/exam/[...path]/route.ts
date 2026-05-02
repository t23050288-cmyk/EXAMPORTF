import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const JWT_SECRET = process.env.JWT_SECRET || "examguard_secret_2026";

async function verifyToken(req: NextRequest) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch { return null; }
}

async function handleStart(req: NextRequest): Promise<NextResponse> {
  const payload = await verifyToken(req);
  if (!payload) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const studentId = payload.sub as string;
  const now = new Date().toISOString();
  await supabase.from("exam_status").update({ status: "active", started_at: now, last_active: now })
    .eq("student_id", studentId).eq("status", "not_started");
  return NextResponse.json({ started_at: now });
}

async function handleQuestions(req: NextRequest): Promise<NextResponse> {
  const payload = await verifyToken(req);
  if (!payload) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const branch = (payload.branch as string) || "CS";
  const title = req.nextUrl.searchParams.get("title") || "";

  // Try to find exam config — support both "title" and "exam_title" column names
  let config: any = null;
  if (title) {
    const { data: c1 } = await supabase.from("exam_config")
      .select("*").eq("title", title).maybeSingle();
    if (!c1) {
      const { data: c2 } = await supabase.from("exam_config")
        .select("*").eq("exam_title", title).maybeSingle();
      config = c2;
    } else {
      config = c1;
    }
  }
  // If no config found, get the first active one
  if (!config) {
    const { data: fallback } = await supabase.from("exam_config")
      .select("*").eq("is_active", true).order("updated_at", { ascending: false }).limit(1);
    config = fallback?.[0] || null;
  }
  // If still no config, get any config
  if (!config) {
    const { data: anyConfig } = await supabase.from("exam_config")
      .select("*").order("updated_at", { ascending: false }).limit(1);
    config = anyConfig?.[0] || null;
  }

  // Only block if config explicitly says is_active = false
  if (config && config.is_active === false) {
    return NextResponse.json({ detail: "exam_inactive" }, { status: 423 });
  }

  // Use config title or the requested title
  const examTitle = title || config?.title || config?.exam_title || "";

  // Query questions — support both old schema (exam_identity, option_a) and new schema (exam_name, options array)
  let questions: any[] = [];
  
  // Try new schema first (exam_name, options array)
  if (examTitle && branch) {
    const { data: q1 } = await supabase.from("questions")
      .select("id, text, options, marks, image_url, order_index, branch, exam_name")
      .eq("branch", branch).eq("exam_name", examTitle).order("order_index");
    if (q1?.length) questions = q1;
  }
  
  // Try old schema (exam_identity, option_a/b/c/d columns, question_text)
  if (!questions.length) {
    const { data: q2 } = await supabase.from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks, image_url, order_index, branch, exam_identity")
      .order("order_index");
    if (q2?.length) {
      // Filter by branch if possible
      const filtered = branch ? q2.filter(q => !q.branch || q.branch === branch) : q2;
      // Normalize to new schema format
      questions = (filtered.length ? filtered : q2).map(q => ({
        id: q.id,
        text: q.question_text || q.text || "",
        options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
        correct_answer: q.correct_answer,
        marks: q.marks || 1,
        image_url: q.image_url || null,
        order_index: q.order_index || 1,
        branch: q.branch,
        exam_name: q.exam_identity || q.exam_name || examTitle,
      }));
    }
  }

  // Fallback: get ALL questions regardless of branch/title
  if (!questions.length) {
    const { data: q3 } = await supabase.from("questions").select("*").limit(200);
    if (q3?.length) {
      questions = q3.map(q => ({
        id: q.id,
        text: q.question_text || q.text || "",
        options: q.options || [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
        correct_answer: q.correct_answer,
        marks: q.marks || 1,
        image_url: q.image_url || null,
        order_index: q.order_index || 1,
        branch: q.branch,
        exam_name: q.exam_identity || q.exam_name || examTitle,
      }));
    }
  }

  if (!questions.length) return NextResponse.json({ detail: "No questions found for your branch" }, { status: 404 });
  
  if (config?.shuffle_questions) questions = questions.sort(() => Math.random() - 0.5);
  return NextResponse.json({ questions, config });
}

async function handleSaveAnswer(req: NextRequest): Promise<NextResponse> {
  const payload = await verifyToken(req);
  if (!payload) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const studentId = payload.sub as string;
  const { question_id, answer } = await req.json();
  const { data: existing } = await supabase.from("exam_results").select("answers").eq("student_id", studentId).single();
  const currentAnswers = existing?.answers || {};
  currentAnswers[question_id] = answer;
  await supabase.from("exam_results").upsert({ student_id: studentId, answers: currentAnswers }, { onConflict: "student_id" });
  await supabase.from("exam_status").update({ last_active: new Date().toISOString() }).eq("student_id", studentId);
  return NextResponse.json({ saved: true });
}

async function handleSubmit(req: NextRequest): Promise<NextResponse> {
  const payload = await verifyToken(req);
  if (!payload) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const studentId = payload.sub as string;
  const branch = (payload.branch as string) || "CS";
  const { answers, exam_title } = await req.json();
  const title = exam_title || "Initial Assessment";
  const { data: questions } = await supabase.from("questions")
    .select("id, correct_answer, marks").eq("branch", branch).eq("exam_name", title);
  const { data: config } = await supabase.from("exam_config")
    .select("marks_per_question, negative_marks").eq("title", title).maybeSingle();
  let score = 0, correct = 0, wrong = 0, skipped = 0;
  const totalMarks = questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 0;
  questions?.forEach(q => {
    const ans = answers[q.id];
    if (!ans) { skipped++; return; }
    if (ans === q.correct_answer) { correct++; score += (q.marks || config?.marks_per_question || 1); }
    else { wrong++; score -= (config?.negative_marks || 0); }
  });
  score = Math.max(0, score);
  const now = new Date().toISOString();
  await supabase.from("exam_results").upsert({ student_id: studentId, answers, score, total_marks: totalMarks, submitted_at: now }, { onConflict: "student_id" });
  await supabase.from("exam_status").update({ status: "submitted", submitted_at: now }).eq("student_id", studentId);
  await supabase.from("students").update({ is_active_session: false, current_token: null }).eq("id", studentId);
  return NextResponse.json({ score, total_marks: totalMarks, correct, wrong, skipped, total: questions?.length || 0, correct_count: correct, wrong_count: wrong, skipped_count: skipped });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
  if (path === "questions") return handleQuestions(req);
  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
  if (path === "start") return handleStart(req);
  if (path === "save-answer") return handleSaveAnswer(req);
  if (path === "submit") return handleSubmit(req);
  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}
