import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "examguard_secret_2026");
    const { payload } = await jwtVerify(token, secret);
    const branch = payload.branch as string || "CS";

    const title = req.nextUrl.searchParams.get("title") || "Initial Assessment";

    const { data: config } = await supabase.from("exam_config")
      .select("is_active, exam_title, duration_minutes, shuffle_questions")
      .eq("exam_title", title).single();

    if (!config?.is_active) return NextResponse.json({ detail: "exam_inactive" }, { status: 423 });

    let query = supabase.from("questions").select("id, text, options, marks, image_url, order_index, branch, exam_name")
      .eq("branch", branch).eq("exam_name", title);

    const { data: questions } = await query.order("order_index");

    if (!questions?.length) return NextResponse.json({ detail: "No questions found for your branch" }, { status: 404 });

    let qs = questions;
    if (config.shuffle_questions) qs = qs.sort(() => Math.random() - 0.5);

    return NextResponse.json({ questions: qs, config });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
