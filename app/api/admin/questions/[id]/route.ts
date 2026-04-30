import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  const body = await req.json();
  await supabase.from("questions").update(body).eq("id", params.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  await supabase.from("questions").delete().eq("id", params.id);
  return NextResponse.json({ ok: true });
}
