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

// Normalize any DB row shape into the standard question format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeQuestion(q: Record<string, any>, fallbackExamName: string, idx: number) {
  return {
    id: q.id,
    text: (q.text || q.question_text || q.question || "") as string,
    options: Array.isArray(q.options)
      ? q.options
      : [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean) as string[],
    correct_answer: (q.correct_answer || "A") as string,
    marks: (q.marks || 1) as number,
    image_url: (q.image_url || null) as string | null,
    order_index: (q.order_index || idx + 1) as number,
    branch: (q.branch || "") as string,
    exam_name: (q.exam_name || q.exam_identity || fallbackExamName) as string,
  };
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

  const branch = (payload.branch as string) || "";
  const requestedTitle = req.nextUrl.searchParams.get("title") || "";

  // ── Get exam config ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: Record<string, any> | null = null;

  if (requestedTitle) {
    // Try column "title" first (actual DB schema), then "exam_title" (legacy)
    const { data: c1 } = await supabase.from("exam_config").select("*").eq("title", requestedTitle).maybeSingle();
    if (c1) config = c1;
    else {
      const { data: c2 } = await supabase.from("exam_config").select("*").eq("exam_title", requestedTitle).maybeSingle();
      if (c2) config = c2;
    }
  }

  // Fallback: first active config
  if (!config) {
    const { data: rows } = await supabase.from("exam_config").select("*").eq("is_active", true).order("updated_at", { ascending: false }).limit(1);
    config = rows?.[0] ?? null;
  }

  // Fallback: any config
  if (!config) {
    const { data: rows } = await supabase.from("exam_config").select("*").order("updated_at", { ascending: false }).limit(1);
    config = rows?.[0] ?? null;
  }

  // Block only if config explicitly says inactive
  if (config?.is_active === false) {
    return NextResponse.json({ detail: "exam_inactive" }, { status: 423 });
  }

  const examTitle = requestedTitle || (config?.title as string) || (config?.exam_title as string) || "";

  // ── Fetch questions ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let questions: Record<string, any>[] = [];

  // 1. New schema: exam_name + options array
  if (examTitle) {
    const q = branch
      ? await supabase.from("questions").select("id, text, options, marks, image_url, order_index, branch, exam_name, correct_answer").eq("branch", branch).eq("exam_name", examTitle).order("order_index")
      : await supabase.from("questions").select("id, text, options, marks, image_url, order_index, branch, exam_name, correct_answer").eq("exam_name", examTitle).order("order_index");
    if (q.data?.length) questions = q.data;
  }

  // 2. Old schema: exam_identity + option_a/b/c/d columns
  if (!questions.length) {
    const q = await supabase.from("questions")
      .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks, image_url, order_index, branch, exam_identity")
      .order("order_index");
    if (q.data?.length) {
      const all = q.data as Record<string, unknown>[];
      const filtered = branch ? all.filter(r => !r.branch || r.branch === branch) : all;
      questions = filtered.length ? filtered : all;
    }
  }

  // 3. Last resort: everything
  if (!questions.length) {
    const q = await supabase.from("questions").select("*").limit(200);
    if (q.data?.length) questions = q.data;
  }

  if (!questions.length) {
    return NextResponse.json({ detail: "No questions found for your branch" }, { status: 404 });
  }

  let normalized = questions.map((q, i) => normalizeQuestion(q as Record<string, unknown>, examTitle, i));
  if (config?.shuffle_questions) normalized = normalized.sort(() => Math.random() - 0.5);

  return NextResponse.json({ questions: normalized, config });
}

async function handleSaveAnswer(req: NextRequest): Promise<NextResponse> {
  const payload = await verifyToken(req);
  if (!payload) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const studentId = payload.sub as string;
  const { question_id, answer } = await req.json();
  const { data: existing } = await supabase.from("exam_results").select("answers").eq("student_id", studentId).single();
  const currentAnswers = (existing?.answers as Record<string, string>) || {};
  currentAnswers[question_id] = answer;
  await supabase.from("exam_results").upsert({ student_id: studentId, answers: currentAnswers }, { onConflict: "student_id" });
  await supabase.from("exam_status").update({ last_active: new Date().toISOString() }).eq("student_id", studentId);
  return NextResponse.json({ saved: true });
}

async function handleSubmit(req: NextRequest): Promise<NextResponse> {
  const payload = await verifyToken(req);
  if (!payload) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  const studentId = payload.sub as string;
  const branch = (payload.branch as string) || "";
  const body = await req.json();
  const answers = body.answers as Record<string, string>;
  const examTitleFromBody = (body.exam_title as string) || "";

  const { data: qRows } = await supabase.from("questions")
    .select("id, correct_answer, marks")
    .eq("branch", branch)
    .eq("exam_name", examTitleFromBody);

  const { data: configRow } = await supabase.from("exam_config")
    .select("marks_per_question, negative_marks").eq("title", examTitleFromBody).maybeSingle();

  const questions = (qRows || []) as { id: string; correct_answer: string; marks: number }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = configRow as Record<string, any> | null;

  let score = 0, correct = 0, wrong = 0, skipped = 0;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  questions.forEach(q => {
    const ans = answers?.[q.id];
    if (!ans) { skipped++; return; }
    if (ans === q.correct_answer) {
      correct++;
      score += q.marks || cfg?.marks_per_question || 1;
    } else {
      wrong++;
      score -= cfg?.negative_marks || 0;
    }
  });
  score = Math.max(0, score);

  const now = new Date().toISOString();
  await supabase.from("exam_results").upsert(
    { student_id: studentId, answers, score, total_marks: totalMarks, submitted_at: now },
    { onConflict: "student_id" }
  );
  await supabase.from("exam_status").update({ status: "submitted", submitted_at: now }).eq("student_id", studentId);
  await supabase.from("students").update({ is_active_session: false, current_token: null }).eq("id", studentId);

  return NextResponse.json({
    score, total_marks: totalMarks, correct, wrong, skipped,
    total: questions.length, correct_count: correct, wrong_count: wrong, skipped_count: skipped
  });
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
