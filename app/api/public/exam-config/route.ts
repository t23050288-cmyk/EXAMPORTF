import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET() {
  const { data } = await supabase.from("exam_config").select("*").order("updated_at", { ascending: false });
  return NextResponse.json(data || []);
}
