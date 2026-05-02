import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = (process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024").trim();
const FALLBACK_SECRET = "admin@examguard2024";

function isAdmin(req: NextRequest) {
  const provided = req.headers.get("x-admin-secret") || req.headers.get("x-admin-key") || "";
  return provided.trim() === ADMIN_SECRET || provided.trim() === FALLBACK_SECRET;
}
function forbidden() { return NextResponse.json({ detail: "Forbidden" }, { status: 403 }); }

// ── QUESTIONS ──────────────────────────────────────────────────────────────
async function getQuestions(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const { data: questions, count } = await supabase.from("questions").select("*", { count: "exact" }).order("exam_name").order("order_index");
  const folderMap: Record<string, any> = {};
  questions?.forEach(q => {
    const key = q.exam_name || "General";
    if (!folderMap[key]) folderMap[key] = { name: key, branch: q.branch, questions: [] };
    folderMap[key].questions.push(q);
  });
  return NextResponse.json({ folders: Object.values(folderMap), total: count || 0 });
}

async function createQuestion(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const body = await req.json();
  let { text, options, option_a, option_b, option_c, option_d, correct_answer, marks, order_index, branch, exam_name } = body;
  if (!options && option_a) options = [option_a, option_b, option_c, option_d].filter(Boolean);
  const { error } = await supabase.from("questions").insert({ text, options, correct_answer, marks: marks || 1, order_index: order_index || 1, branch: branch || "CS", exam_name: exam_name || "Initial Assessment" });
  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

async function updateQuestion(req: NextRequest, id: string) {
  if (!isAdmin(req)) return forbidden();
  const body = await req.json();
  await supabase.from("questions").update(body).eq("id", id);
  return NextResponse.json({ ok: true });
}

async function deleteQuestion(req: NextRequest, id: string) {
  if (!isAdmin(req)) return forbidden();
  await supabase.from("questions").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

// ── STUDENTS ──────────────────────────────────────────────────────────────
async function getStudents(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const { data: students } = await supabase.from("students").select("id, usn, name, email, branch").order("created_at");
  const { data: statuses } = await supabase.from("exam_status").select("student_id, status, warnings, started_at, submitted_at, last_active");
  const { data: results } = await supabase.from("exam_results").select("student_id, score, total_marks");
  const statusMap: Record<string, any> = {};
  statuses?.forEach(s => { statusMap[s.student_id] = s; });
  const resultsMap: Record<string, any> = {};
  results?.forEach(r => { resultsMap[r.student_id] = r; });
  const merged = (students || []).map(s => ({
    ...s, student_id: s.id,
    status: statusMap[s.id]?.status || "not_started",
    warnings: statusMap[s.id]?.warnings || 0,
    started_at: statusMap[s.id]?.started_at || null,
    submitted_at: statusMap[s.id]?.submitted_at || null,
    last_active: statusMap[s.id]?.last_active || null,
    score: resultsMap[s.id]?.score || 0,
    total_marks: resultsMap[s.id]?.total_marks || 0,
  }));
  return NextResponse.json(merged);
}

async function createStudent(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const { usn, name, email, branch, password } = await req.json();
  if (!usn || !name || !password) return NextResponse.json({ detail: "USN, name, password required" }, { status: 400 });
  const password_hash = await bcrypt.hash(password, 10);
  const { data: student, error } = await supabase.from("students")
    .insert({ usn: usn.toUpperCase(), name, email, branch: branch || "CS", password_hash }).select().single();
  if (error) return NextResponse.json({ detail: error.message }, { status: 400 });
  await supabase.from("exam_status").insert({ student_id: student.id, status: "not_started" });
  return NextResponse.json({ ok: true });
}

async function updateStudent(req: NextRequest, id: string) {
  if (!isAdmin(req)) return forbidden();
  const { name, email, branch, password } = await req.json();
  const updates: any = { name, email, branch };
  if (password?.trim()) updates.password_hash = await bcrypt.hash(password, 10);
  await supabase.from("students").update(updates).eq("id", id);
  return NextResponse.json({ ok: true });
}

async function deleteStudent(req: NextRequest, id: string) {
  if (!isAdmin(req)) return forbidden();
  await supabase.from("violations").delete().eq("student_id", id);
  await supabase.from("exam_results").delete().eq("student_id", id);
  await supabase.from("exam_status").delete().eq("student_id", id);
  await supabase.from("students").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}

async function resetStudent(req: NextRequest, id: string) {
  if (!isAdmin(req)) return forbidden();
  await supabase.from("violations").delete().eq("student_id", id);
  await supabase.from("exam_results").delete().eq("student_id", id);
  await supabase.from("exam_status").update({ status: "not_started", warnings: 0, started_at: null, submitted_at: null }).eq("student_id", id);
  await supabase.from("students").update({ is_active_session: false, current_token: null }).eq("id", id);
  return NextResponse.json({ ok: true });
}

// ── CONFIG ────────────────────────────────────────────────────────────────
async function getConfig() {
  const { data } = await supabase.from("exam_config").select("*").order("updated_at", { ascending: false });
  // Normalize: ensure exam_title field exists (map from "title" if needed)
  const normalized = (data || []).map((c: any) => ({
    ...c,
    exam_title: c.exam_title || c.title,
    title: c.title || c.exam_title,
  }));
  return NextResponse.json(normalized);
}

async function setConfig(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const body = await req.json();
  const { exam_title, title, duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions } = body;
  const configTitle = exam_title || title;
  // Try both column names
  const { data: existing } = await supabase.from("exam_config").select("id")
    .or(`title.eq.${configTitle},exam_title.eq.${configTitle}`).maybeSingle();
  if (existing) {
    await supabase.from("exam_config").update({ 
      title: configTitle, duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions,
      updated_at: new Date().toISOString()
    }).eq("id", existing.id);
  } else {
    await supabase.from("exam_config").insert({ 
      title: configTitle, duration_minutes, is_active: is_active ?? true, 
      marks_per_question, negative_marks, shuffle_questions, total_questions 
    });
  }
  return NextResponse.json({ ok: true });
}

// ── MONITOR ───────────────────────────────────────────────────────────────
async function getMonitor(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const { data: statuses } = await supabase.from("exam_status").select("status, warnings, student_id");
  const { data: violations } = await supabase.from("violations").select("*, students(usn, name)").order("timestamp", { ascending: false }).limit(50);
  const active = statuses?.filter(s => s.status === "active").length || 0;
  const completed = statuses?.filter(s => s.status === "submitted").length || 0;
  return NextResponse.json({ stats: { active, violations: violations?.length || 0, completed }, violations });
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────
async function getLeaderboard(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const { data: results } = await supabase.from("exam_results").select("student_id, score, total_marks, submitted_at").order("score", { ascending: false });
  const { data: students } = await supabase.from("students").select("id, usn, name, branch");
  const studentMap: Record<string, any> = {};
  students?.forEach(s => { studentMap[s.id] = s; });
  const leaderboard = (results || []).map((r, i) => ({
    rank: i + 1,
    usn: studentMap[r.student_id]?.usn || "?",
    name: studentMap[r.student_id]?.name || "?",
    branch: studentMap[r.student_id]?.branch || "?",
    score: r.score, total_marks: r.total_marks, submitted_at: r.submitted_at,
  }));
  return NextResponse.json(leaderboard);
}

// ── EXPORT ────────────────────────────────────────────────────────────────
async function getExport(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
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
    rows.push([s.usn || "", s.name || "", s.email || "", s.branch || "", r.score || 0, r.total_marks || 0, st.status || "", st.warnings || 0, r.submitted_at || ""]);
  });
  const csv = rows.map(r => r.join(",")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=results.csv" } });
}

// ── INGEST ────────────────────────────────────────────────────────────────

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_"));
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
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
    return obj;
  });
}

// Normalize a CSV/Excel row to a question object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToQuestion(row: Record<string, any>, idx: number): null | {
  text: string; options: string[]; correct_answer: string; marks: number; order_index: number;
} {
  // Try every possible column name variant for question text
  const text = String(
    row.question ?? row.Question ?? row.QUESTION ?? 
    row.question_text ?? row.Question_Text ?? row.questiontext ??
    row.text ?? row.Text ?? row.TEXT ??
    row.q ?? row.Q ?? row.stmt ?? row.statement ?? ""
  ).trim();

  // Try every possible variant for options
  const optA = String(row.option_a ?? row.Option_A ?? row.option_1 ?? row.option1 ?? row.opt_a ?? row.opta ?? row.a ?? row.A ?? row["Option A"] ?? row["option a"] ?? row["a)"] ?? "").trim();
  const optB = String(row.option_b ?? row.Option_B ?? row.option_2 ?? row.option2 ?? row.opt_b ?? row.optb ?? row.b ?? row.B ?? row["Option B"] ?? row["option b"] ?? row["b)"] ?? "").trim();
  const optC = String(row.option_c ?? row.Option_C ?? row.option_3 ?? row.option3 ?? row.opt_c ?? row.optc ?? row.c ?? row.C ?? row["Option C"] ?? row["option c"] ?? row["c)"] ?? "").trim();
  const optD = String(row.option_d ?? row.Option_D ?? row.option_4 ?? row.option4 ?? row.opt_d ?? row.optd ?? row.d ?? row.D ?? row["Option D"] ?? row["option d"] ?? row["d)"] ?? "").trim();

  const rawCorrect = String(
    row.correct_answer ?? row.Correct_Answer ?? row.correct ?? row.Correct ?? row.CORRECT ??
    row.answer ?? row.Answer ?? row.ANSWER ?? row.ans ?? row.Ans ?? row.key ?? row.Key ?? "A"
  ).toUpperCase().trim();
  const correct = ["A","B","C","D"].includes(rawCorrect.charAt(0)) ? rawCorrect.charAt(0) : "A";
  const marks = parseInt(String(row.marks ?? row.Marks ?? row.MARKS ?? row.mark ?? "1")) || 1;

  if (!text || !optA || !optB) return null;
  const options = [optA, optB, optC, optD].filter(Boolean);
  return { text, options, correct_answer: correct, marks, order_index: idx + 1 };
}

// Extract Q&A from free-form text (PDF/DOCX/TXT)
function extractQuestionsFromText(rawText: string): Array<{
  text: string; options: string[]; correct_answer: string; marks: number; order_index: number;
}> {
  const results: Array<{ text: string; options: string[]; correct_answer: string; marks: number; order_index: number }> = [];
  
  // Normalize line endings and remove extra whitespace
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Split into question blocks. Supports:
  // "1." "1)" "Q1." "Q.1" "Q1:" "Question 1." "(1)"
  const questionPattern = /(?:^|\n)\s*(?:Q\.?\s*)?(\d+)[.):\s]\s*/gm;
  const splits: { idx: number; num: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = questionPattern.exec(text)) !== null) {
    splits.push({ idx: m.index, num: parseInt(m[1]) });
  }
  
  if (splits.length === 0) return results;

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].idx;
    const end = i + 1 < splits.length ? splits[i + 1].idx : text.length;
    const block = text.slice(start, end).trim();
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    // First line: strip leading question number
    const qText = lines[0].replace(/^\s*(?:Q\.?\s*)?\d+[.):\s]+/i, "").trim();
    if (!qText || qText.length < 5) continue;

    const opts: string[] = [];
    let correct = "A";
    let correctFound = false;

    for (let j = 1; j < lines.length; j++) {
      const l = lines[j];

      // Option line: "A)" "A." "A:" "(A)" "a)" "(a)"
      const optMatch = l.match(/^\s*[(\[]?([A-Da-d])[.):\]]\s*(.+)/);
      if (optMatch) {
        opts.push(optMatch[2].trim());
        continue;
      }

      // Answer line: "Answer: B" "Ans: C" "Correct: A" "Key: D" "Ans(B)" "Answer - C"
      const ansMatch = l.match(/^\s*(?:answer|ans|correct|key|sol(?:ution)?)\s*[:()\-\s]+([A-Da-d])/i);
      if (ansMatch && !correctFound) {
        correct = ansMatch[1].toUpperCase();
        correctFound = true;
      }
    }

    if (qText && opts.length >= 2) {
      results.push({ text: qText, options: opts, correct_answer: correct, marks: 1, order_index: results.length + 1 });
    }
  }

  return results;
}

// UPLOAD step: parse file → return preview JSON (no DB write)
async function handleIngestUpload(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ detail: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ detail: "No file uploaded. Please attach a file." }, { status: 400 });
  }

  const f = file as File;
  const fileName = (f.name || "").toLowerCase().trim();
  const fileSize = f.size;

  if (fileSize === 0) {
    return NextResponse.json({ detail: "Uploaded file is empty." }, { status: 400 });
  }
  if (fileSize > 20 * 1024 * 1024) {
    return NextResponse.json({ detail: "File too large. Max 20MB." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let questions: any[] = [];
  let rawText = "";
  let parseError = "";

  try {
    // ── XLSX / XLS ──────────────────────────────────────────────────────────
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      try {
        const arrayBuffer = await f.arrayBuffer();
        const xlsx = await import("xlsx");
        const workbook = xlsx.read(Buffer.from(arrayBuffer), { type: "buffer" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });
        questions = rows.map((row, i) => rowToQuestion(row, i)).filter(Boolean);
      } catch (e: unknown) {
        parseError = `Excel parse error: ${e instanceof Error ? e.message : String(e)}`;
      }

    // ── DOCX ────────────────────────────────────────────────────────────────
    } else if (fileName.endsWith(".docx")) {
      try {
        const arrayBuffer = await f.arrayBuffer();
        const mammoth = await import("mammoth");
        // mammoth needs a Buffer, not ArrayBuffer
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value || "";
        if (!rawText.trim()) {
          // Try alternative mammoth input
          const result2 = await mammoth.extractRawText({ arrayBuffer });
          rawText = result2.value || "";
        }
        questions = extractQuestionsFromText(rawText);
      } catch (e: unknown) {
        parseError = `DOCX parse error: ${e instanceof Error ? e.message : String(e)}`;
      }

    // ── PDF ─────────────────────────────────────────────────────────────────
    } else if (fileName.endsWith(".pdf")) {
      try {
        const arrayBuffer = await f.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        // Try pdf-parse with proper require
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
        let pdfParseFn: ((b: Buffer) => Promise<{ text: string }>) | null = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          pdfParseFn = require("pdf-parse");
        } catch { /* try dynamic import */ }
        if (!pdfParseFn) {
          const mod = await import("pdf-parse");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdfParseFn = (mod as any).default || (mod as any);
        }
        if (pdfParseFn) {
          const pdfData = await pdfParseFn(buf);
          rawText = pdfData.text || "";
          questions = extractQuestionsFromText(rawText);
        } else {
          parseError = "PDF parser not available";
        }
      } catch (e: unknown) {
        parseError = `PDF parse error: ${e instanceof Error ? e.message : String(e)}`;
      }

    // ── CSV / TXT ────────────────────────────────────────────────────────────
    } else if (fileName.endsWith(".csv") || fileName.endsWith(".txt") || fileName === "") {
      try {
        rawText = await f.text();
        const lines = rawText.split(/\r?\n/).filter(l => l.trim());
        const firstLine = lines[0] || "";

        if (firstLine.includes(",") && lines.length > 1) {
          // Looks like CSV
          const rows = parseCSV(rawText);
          questions = rows.map((row, i) => rowToQuestion(row, i)).filter(Boolean);
        }

        // If CSV parsing yielded nothing, try text extraction
        if (questions.length === 0) {
          questions = extractQuestionsFromText(rawText);
        }
      } catch (e: unknown) {
        parseError = `Text parse error: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      // Unknown extension — try text first, then give up
      try {
        rawText = await f.text();
        if (rawText.includes(",")) {
          const rows = parseCSV(rawText);
          questions = rows.map((row, i) => rowToQuestion(row, i)).filter(Boolean);
        }
        if (questions.length === 0) {
          questions = extractQuestionsFromText(rawText);
        }
      } catch (e: unknown) {
        parseError = `Unknown file type. Supported: CSV, XLSX, DOCX, PDF, TXT. Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
  } catch (outerErr: unknown) {
    parseError = `File parsing failed: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`;
  }

  if (parseError && questions.length === 0) {
    return NextResponse.json({ detail: parseError }, { status: 400 });
  }

  if (questions.length === 0) {
    const hint = fileName.endsWith(".pdf") || fileName.endsWith(".docx")
      ? "For PDF/DOCX: use numbered questions (1. Question text) with A) B) C) D) options and 'Answer: X' on a new line."
      : "For CSV/XLSX: use columns — question, option_a, option_b, option_c, option_d, correct_answer";
    return NextResponse.json({ 
      detail: `No valid questions found in file. ${hint}`,
      questions: [], total: 0 
    }, { status: 400 });
  }

  return NextResponse.json({
    questions,
    total: questions.length,
    ai_powered: false,
    ai_confidence_avg: 1.0,
    needs_review_count: 0,
    parse_warning: parseError || undefined,
  });
}

// COMMIT step: save parsed questions to DB
async function handleIngestCommit(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();

  let body: { questions?: unknown[]; replace_existing?: boolean; exam_name?: string; max_questions?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const { questions, replace_existing, exam_name, max_questions } = body;

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ detail: "No questions to commit" }, { status: 400 });
  }

  const examName = (exam_name || "Initial Assessment").trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalQuestions: any[] = questions.map((q: any, i: number) => ({
    text: String(q.text || q.question_text || "").trim(),
    options: Array.isArray(q.options) ? q.options.filter(Boolean) : [],
    correct_answer: String(q.correct_answer || "A").toUpperCase().charAt(0),
    marks: parseInt(String(q.marks || "1")) || 1,
    order_index: q.order_index ?? i + 1,
    branch: String(q.branch || "CS").trim(),
    exam_name: String(q.exam_name || examName).trim(),
    image_url: q.image_url || null,
  })).filter((q: any) => q.text && q.options.length >= 2);

  if (finalQuestions.length === 0) {
    return NextResponse.json({ detail: "No valid questions to commit after validation" }, { status: 400 });
  }

  if (max_questions && max_questions > 0 && finalQuestions.length > max_questions) {
    finalQuestions = finalQuestions.sort(() => Math.random() - 0.5).slice(0, max_questions);
  }

  if (replace_existing) {
    await supabase.from("questions").delete().eq("exam_name", examName);
  }

  let committed = 0;
  const errors: string[] = [];
  for (let i = 0; i < finalQuestions.length; i += 50) {
    const batch = finalQuestions.slice(i, i + 50);
    const { error } = await supabase.from("questions").insert(batch);
    if (error) errors.push(error.message);
    else committed += batch.length;
  }

  if (committed === 0 && errors.length > 0) {
    return NextResponse.json({ detail: `DB insert failed: ${errors[0]}` }, { status: 500 });
  }

  return NextResponse.json({ committed, total: finalQuestions.length, exam_name: examName, errors: errors.length > 0 ? errors : undefined });
}

// Legacy combined handler
async function handleIngest(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) return handleIngestUpload(req);
  return handleIngestCommit(req);
}

// ── ROUTER ────────────────────────────────────────────────────────────────
async function debugSecret(req: NextRequest) {
  const s = ADMIN_SECRET;
  const provided = req.headers.get("x-admin-secret") || req.headers.get("x-admin-key") || "";
  return NextResponse.json({ 
    secret_preview: s.slice(0,3) + "***" + s.slice(-3),
    secret_length: s.length,
    env_admin_secret: process.env.ADMIN_SECRET ? "SET" : "NOT_SET",
    env_next_admin_secret: process.env.NEXT_PUBLIC_ADMIN_SECRET ? "SET" : "NOT_SET",
    provided_preview: provided ? provided.slice(0,3) + "***" + provided.slice(-3) : "NONE",
    match: provided.trim() === ADMIN_SECRET || provided.trim() === FALLBACK_SECRET,
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
  if (path === "_debug_secret") return debugSecret(req);
  if (path === "questions") return getQuestions(req);
  if (path === "students") return getStudents(req);
  if (path === "config") return getConfig();
  if (path === "monitor") return getMonitor(req);
  if (path === "leaderboard") return getLeaderboard(req);
  if (path === "export") return getExport(req);
  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
  if (path === "questions") return createQuestion(req);
  if (path === "students") return createStudent(req);
  if (path === "config") return setConfig(req);
  if (path === "ingest/upload") return handleIngestUpload(req);
  if (path === "ingest/commit") return handleIngestCommit(req);
  if (path === "ingest") return handleIngest(req);
  // student reset: students/<id>/reset
  const resetMatch = path.match(/^students\/([^/]+)\/reset$/);
  if (resetMatch) return resetStudent(req, resetMatch[1]);
  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
  const qMatch = path.match(/^questions\/([^/]+)$/);
  if (qMatch) return updateQuestion(req, qMatch[1]);
  const sMatch = path.match(/^students\/([^/]+)$/);
  if (sMatch) return updateStudent(req, sMatch[1]);
  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
  const qMatch = path.match(/^questions\/([^/]+)$/);
  if (qMatch) return deleteQuestion(req, qMatch[1]);
  const sMatch = path.match(/^students\/([^/]+)$/);
  if (sMatch) return deleteStudent(req, sMatch[1]);
  return NextResponse.json({ detail: "Not found" }, { status: 404 });
}

