import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

function parseCSV(content: string) {
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
  return lines.slice(1).map(line => {
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === "," && !inQ) { cols.push(cur.trim()); cur = ""; continue; }
      cur += line[i];
    }
    cols.push(cur.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
    return obj;
  });
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) return NextResponse.json({ detail: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const examName = (formData.get("exam_name") as string) || "Initial Assessment";
  const branch = (formData.get("branch") as string) || "CS";
  const countLimit = parseInt((formData.get("count") as string) || "0") || 0;

  if (!file) return NextResponse.json({ detail: "No file provided" }, { status: 400 });

  const content = await file.text();
  const rows = parseCSV(content);

  const questions = rows.map((row, i) => {
    const text = row.text || row.question || row.question_text || row.q || "";
    const optA = row.option_a || row.a || row.opt_a || row.option1 || "";
    const optB = row.option_b || row.b || row.opt_b || row.option2 || "";
    const optC = row.option_c || row.c || row.opt_c || row.option3 || "";
    const optD = row.option_d || row.d || row.opt_d || row.option4 || "";
    const correct = (row.correct_answer || row.answer || row.correct || "A").toString().toUpperCase().trim().charAt(0);
    const marks = parseInt(row.marks || "1") || 1;
    if (!text || !optA || !optB) return null;
    return {
      text,
      options: [optA, optB, optC, optD].filter(Boolean),
      correct_answer: ["A","B","C","D"].includes(correct) ? correct : "A",
      marks,
      order_index: i + 1,
      exam_name: examName,
      branch,
    };
  }).filter(Boolean);

  let finalQuestions = questions as any[];
  if (countLimit > 0 && finalQuestions.length > countLimit) {
    finalQuestions = finalQuestions.sort(() => Math.random() - 0.5).slice(0, countLimit);
  }

  if (!finalQuestions.length) {
    return NextResponse.json({ detail: "No valid questions. Ensure columns: text/question, option_a, option_b, correct_answer" }, { status: 400 });
  }

  let imported = 0;
  for (let i = 0; i < finalQuestions.length; i += 50) {
    const batch = finalQuestions.slice(i, i + 50);
    const { error } = await supabase.from("questions").insert(batch);
    if (!error) imported += batch.length;
  }

  return NextResponse.json({ imported, total: finalQuestions.length, exam_name: examName });
}
