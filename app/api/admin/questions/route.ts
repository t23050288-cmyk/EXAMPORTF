import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";
function isAdmin(req: NextRequest) { return req.headers.get("x-admin-secret") === ADMIN_SECRET; }

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const { data: questions, count } = await supabase.from("questions").select("*", { count: "exact" }).order("exam_name").order("order_index");
  const folderMap: Record<string, any> = {};
  questions?.forEach(q => {
    const key = q.exam_name || "General";
    if (!folderMap[key]) folderMap[key] = { name: key, branch: q.branch, questions: [] };
    folderMap[key].questions.push(q);
  });
  return NextResponse.json({ folders: Object.values(folderMap), total: count || 0 });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const body = await req.json();
  // Support both old format (option_a/b/c/d) and new format (options array)
  let { text, options, option_a, option_b, option_c, option_d, correct_answer, marks, order_index, branch, exam_name } = body;
  if (!options && option_a) {
    options = [option_a, option_b, option_c, option_d].filter(Boolean);
  }
  const { error } = await supabase.from("questions").insert({ text, options, correct_answer, marks: marks || 1, order_index: order_index || 1, branch: branch || "CS", exam_name: exam_name || "Initial Assessment" });
  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
