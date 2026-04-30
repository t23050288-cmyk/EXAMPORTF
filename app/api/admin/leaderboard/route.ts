import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const { data: results } = await supabase.from("exam_results").select("student_id, score, total_marks, submitted_at").order("score", { ascending: false });
  const { data: students } = await supabase.from("students").select("id, usn, name, branch");
  const studentMap: Record<string, any> = {};
  students?.forEach(s => { studentMap[s.id] = s; });
  const leaderboard = (results || []).map((r, i) => ({
    rank: i + 1,
    usn: studentMap[r.student_id]?.usn || "?",
    name: studentMap[r.student_id]?.name || "?",
    branch: studentMap[r.student_id]?.branch || "?",
    score: r.score,
    total_marks: r.total_marks,
    submitted_at: r.submitted_at,
  }));
  return NextResponse.json(leaderboard);
}
