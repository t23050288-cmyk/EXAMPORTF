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
    await supabase.from("students").update({ is_active_session: false, current_token: null }).eq("id", payload.sub as string);
    return NextResponse.json({ logged_out: true });
  } catch {
    return NextResponse.json({ detail: "Invalid token" }, { status: 401 });
  }
}
