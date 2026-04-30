import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "examguard_secret_2026");
    const { payload } = await jwtVerify(token, secret);
    const studentId = payload.sub as string;
    const branch = payload.branch as string || "CS";
    const { answers, exam_title } = await req.json();

    const title = exam_title || "Initial Assessment";

    // Get questions for scoring
    const { data: questions } = await supabase.from("questions")
      .select("id, correct_answer, marks").eq("branch", branch).eq("exam_name", title);

    const { data: config } = await supabase.from("exam_config")
      .select("marks_per_question, negative_marks").eq("exam_title", title).single();

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
    await supabase.from("exam_results").upsert({
      student_id: studentId, answers, score, total_marks: totalMarks, submitted_at: now
    }, { onConflict: "student_id" });

    await supabase.from("exam_status").update({ status: "submitted", submitted_at: now }).eq("student_id", studentId);
    await supabase.from("students").update({ is_active_session: false, current_token: null }).eq("id", studentId);

    return NextResponse.json({ score, total_marks: totalMarks, correct, wrong, skipped, total: questions?.length || 0, correct_count: correct, wrong_count: wrong, skipped_count: skipped });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
