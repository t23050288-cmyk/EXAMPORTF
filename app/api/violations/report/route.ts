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
    const { type, metadata } = await req.json();

    await supabase.from("violations").insert({ student_id: studentId, type, metadata: metadata || {} });

    const { count } = await supabase.from("violations").select("id", { count: "exact", head: true }).eq("student_id", studentId);
    await supabase.from("exam_status").update({ warnings: count || 0, last_active: new Date().toISOString() }).eq("student_id", studentId);

    return NextResponse.json({ total_violations: count || 0 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
