import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const { data: statuses } = await supabase.from("exam_status").select("status, warnings, student_id");
  const { data: violations } = await supabase.from("violations").select("*, students(usn, name)").order("timestamp", { ascending: false }).limit(50);
  const active = statuses?.filter(s => s.status === "active").length || 0;
  const completed = statuses?.filter(s => s.status === "submitted").length || 0;
  const totalViolations = violations?.length || 0;
  return NextResponse.json({ stats: { active, violations: totalViolations, completed }, violations });
}
