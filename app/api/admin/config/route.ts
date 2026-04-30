import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-secret") === ADMIN_SECRET || req.headers.get("x-admin-key") === ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  const { data } = await supabase.from("exam_config").select("*").order("updated_at", { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const { exam_title, duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions } = body;

  const { data: existing } = await supabase.from("exam_config").select("id").eq("exam_title", exam_title).single();
  if (existing) {
    await supabase.from("exam_config").update({ duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions })
      .eq("exam_title", exam_title);
  } else {
    await supabase.from("exam_config").insert({ exam_title, duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions });
  }
  return NextResponse.json({ ok: true });
}
