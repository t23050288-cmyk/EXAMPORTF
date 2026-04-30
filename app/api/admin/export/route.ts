import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const { data: results } = await supabase.from("exam_results").select("student_id, score, total_marks, submitted_at");
  const { data: students } = await supabase.from("students").select("id, usn, name, email, branch");
  const { data: statuses } = await supabase.from("exam_status").select("student_id, status, warnings");
  const studentMap: Record<string, any> = {};
  students?.forEach(s => { studentMap[s.id] = s; });
  const statusMap: Record<string, any> = {};
  statuses?.forEach(s => { statusMap[s.student_id] = s; });
  const rows = [["USN", "Name", "Email", "Branch", "Score", "Total Marks", "Status", "Warnings", "Submitted At"]];
  (results || []).forEach(r => {
    const s = studentMap[r.student_id] || {};
    const st = statusMap[r.student_id] || {};
    rows.push([s.usn||"", s.name||"", s.email||"", s.branch||"", r.score||0, r.total_marks||0, st.status||"", st.warnings||0, r.submitted_at||""]);
  });
  const csv = rows.map(r => r.join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=results.csv" } });
}
