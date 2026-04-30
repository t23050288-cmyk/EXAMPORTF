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
    const { question_id, answer } = await req.json();

    const { data: existing } = await supabase.from("exam_results").select("answers").eq("student_id", studentId).single();
    const currentAnswers = existing?.answers || {};
    currentAnswers[question_id] = answer;

    await supabase.from("exam_results").upsert({ student_id: studentId, answers: currentAnswers }, { onConflict: "student_id" });
    await supabase.from("exam_status").update({ last_active: new Date().toISOString() }).eq("student_id", studentId);

    return NextResponse.json({ saved: true });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
