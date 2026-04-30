import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  await supabase.from("violations").delete().eq("student_id", params.id);
  await supabase.from("exam_results").delete().eq("student_id", params.id);
  await supabase.from("exam_status").update({ status: "not_started", warnings: 0, started_at: null, submitted_at: null }).eq("student_id", params.id);
  await supabase.from("students").update({ is_active_session: false, current_token: null }).eq("id", params.id);
  return NextResponse.json({ ok: true });
}
