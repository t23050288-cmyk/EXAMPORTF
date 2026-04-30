import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";
function isAdmin(req: NextRequest) { return req.headers.get("x-admin-secret") === ADMIN_SECRET; }

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const { data: students } = await supabase.from("students").select("id, usn, name, email, branch").order("created_at");
  const { data: statuses } = await supabase.from("exam_status").select("student_id, status, warnings, started_at, submitted_at");
  const { data: results } = await supabase.from("exam_results").select("student_id, score, total_marks");
  const statusMap: Record<string, any> = {};
  statuses?.forEach(s => { statusMap[s.student_id] = s; });
  const resultsMap: Record<string, any> = {};
  results?.forEach(r => { resultsMap[r.student_id] = r; });
  const merged = (students || []).map(s => ({
    ...s,
    student_id: s.id,
    status: statusMap[s.id]?.status || "not_started",
    warnings: statusMap[s.id]?.warnings || 0,
    started_at: statusMap[s.id]?.started_at || null,
    submitted_at: statusMap[s.id]?.submitted_at || null,
    last_active: statusMap[s.id]?.last_active || null,
    score: resultsMap[s.id]?.score || 0,
    total_marks: resultsMap[s.id]?.total_marks || 0,
  }));
  return NextResponse.json(merged);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const { usn, name, email, branch, password } = await req.json();
  if (!usn || !name || !password) return NextResponse.json({ detail: "USN, name, password required" }, { status: 400 });
  const password_hash = await bcrypt.hash(password, 10);
  const { data: student, error } = await supabase.from("students")
    .insert({ usn: usn.toUpperCase(), name, email, branch: branch || "CS", password_hash })
    .select().single();
  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  await supabase.from("exam_status").insert({ student_id: student.id, status: "not_started" });
  return NextResponse.json({ ok: true });
}
