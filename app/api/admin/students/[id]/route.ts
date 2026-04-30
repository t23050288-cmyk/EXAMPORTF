import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";
function isAdmin(req: NextRequest) { return req.headers.get("x-admin-secret") === ADMIN_SECRET; }

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const { name, email, branch, password } = await req.json();
  const updates: any = { name, email, branch };
  if (password?.trim()) updates.password_hash = await bcrypt.hash(password, 10);
  await supabase.from("students").update(updates).eq("id", params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  await supabase.from("violations").delete().eq("student_id", params.id);
  await supabase.from("exam_results").delete().eq("student_id", params.id);
  await supabase.from("exam_status").delete().eq("student_id", params.id);
  await supabase.from("students").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}
