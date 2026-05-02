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

function extractQuestionsFromText(rawText: string): any[] {
  const questions: any[] = [];
  // Strategy: look for numbered question patterns like "1.", "Q1.", "Q1:" etc.
  const blocks = rawText.split(/\n(?=\s*(?:Q\s*\d+|\d+[\.\)]|Question\s+\d+))/i);
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;
    // First line = question text (strip leading number/Q prefix)
    const qText = lines[0].replace(/^(?:Q\s*\d+[.:\-]?|\d+[.:\-])\s*/i, "").trim();
    if (!qText || qText.length < 5) continue;
    const opts: string[] = [];
    let correct = "A";
    let correctFound = false;
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      // Match option lines: A) B) C) D) or A. B. C. D.
      const optMatch = l.match(/^([A-Da-d])[.):]\s*(.+)/);
      if (optMatch) {
        opts.push(optMatch[2].trim());
      }
      // Match answer lines: "Answer: B" or "Ans: C" or "Correct: A"
      const ansMatch = l.match(/^(?:answer|ans|correct)[:\s]+([A-Da-d])/i);
      if (ansMatch && !correctFound) {
        correct = ansMatch[1].toUpperCase();
        correctFound = true;
      }
    }
    if (qText && opts.length >= 2) {
      questions.push({ text: qText, options: opts, correct_answer: correct, marks: 1 });
    }
  }
  return questions;
}

// UPLOAD step: parse file, return preview (no DB write)
async function handleIngestUpload(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  
  const fileName = file.name.toLowerCase();
  let questions: any[] = [];
  let rawText = "";

  try {
    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      // Parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      const { read, utils } = await import("xlsx");
      const wb = read(new Uint8Array(arrayBuffer), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = utils.sheet_to_json(ws, { defval: "" });
      questions = rows.map((row: any, i: number) => {
        // Support various column name styles
        const text = row.question || row.Question || row.text || row.Text || row.question_text || row.Q || row.q || "";
        const optA = row.option_a || row.Option_A || row.A || row.option1 || row.Option1 || row.a || row["Option A"] || row["option a"] || "";
        const optB = row.option_b || row.Option_B || row.B || row.option2 || row.Option2 || row.b || row["Option B"] || row["option b"] || "";
        const optC = row.option_c || row.Option_C || row.C || row.option3 || row.Option3 || row.c || row["Option C"] || row["option c"] || "";
        const optD = row.option_d || row.Option_D || row.D || row.option4 || row.Option4 || row.d || row["Option D"] || row["option d"] || "";
        const correct = String(row.correct_answer || row.Correct_Answer || row.answer || row.Answer || row.correct || row.Correct || "A").toUpperCase().trim().charAt(0);
        const marks = parseInt(String(row.marks || row.Marks || "1")) || 1;
        if (!text || !optA || !optB) return null;
        return { text: String(text), options: [String(optA), String(optB), optC ? String(optC) : null, optD ? String(optD) : null].filter(Boolean) as string[], correct_answer: ["A","B","C","D"].includes(correct) ? correct : "A", marks, order_index: i + 1 };
      }).filter(Boolean) as any[];

    } else if (fileName.endsWith(".docx")) {
      // Parse DOCX file
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ arrayBuffer });
      rawText = result.value;
      questions = extractQuestionsFromText(rawText);

    } else if (fileName.endsWith(".pdf")) {
      // For PDF: use text extraction via pdf-parse
      const arrayBuffer = await file.arrayBuffer();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const pdfData = await pdfParse(Buffer.from(arrayBuffer));
      rawText = pdfData.text;
      questions = extractQuestionsFromText(rawText);

    } else {
      // CSV or TXT — read as text
      rawText = await file.text();
      if (fileName.endsWith(".csv") || rawText.split("\n")[0]?.includes(",")) {
        const rows = parseCSV(rawText);
        questions = rows.map((row, i) => {
          const text = row.text || row.question || row.question_text || row.q || "";
          const optA = row.option_a || row.a || row.opt_a || row.option1 || row.opta || "";
          const optB = row.option_b || row.b || row.opt_b || row.option2 || row.optb || "";
          const optC = row.option_c || row.c || row.opt_c || row.option3 || row.optc || "";
          const optD = row.option_d || row.d || row.opt_d || row.option4 || row.optd || "";
          const correct = (row.correct_answer || row.answer || row.correct || row.correct_option || "A").toString().toUpperCase().trim().charAt(0);
          const marks = parseInt(row.marks || row.mark || "1") || 1;
          if (!text || !optA || !optB) return null;
          return { text, options: [optA, optB, optC, optD].filter(Boolean), correct_answer: ["A","B","C","D"].includes(correct) ? correct : "A", marks, order_index: i + 1 };
        }).filter(Boolean) as any[];
      } else {
        questions = extractQuestionsFromText(rawText);
      }
    }
  } catch (parseErr: any) {
    return NextResponse.json({ 
      detail: `File parsing failed: ${parseErr.message}. Supported formats: CSV, XLSX, DOCX, PDF, TXT`,
      questions: [], total: 0 
    }, { status: 400 });
  }

  if (!questions.length) {
    return NextResponse.json({ 
      detail: "No valid questions found in file. For CSV/XLSX use columns: question, option_a, option_b, option_c, option_d, correct_answer. For PDF/DOCX use numbered questions with A) B) C) D) options.",
      questions: [], total: 0 
    }, { status: 400 });
  }

  return NextResponse.json({ 
    questions, 
    total: questions.length,
    ai_powered: false,
    ai_confidence_avg: 1.0,
    needs_review_count: 0
  });
}

// COMMIT step: take parsed questions JSON and save to DB
async function handleIngestCommit(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const body = await req.json();
  const { questions, replace_existing, exam_name, max_questions } = body;
  
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ detail: "No questions to commit" }, { status: 400 });
  }

  const examName = exam_name || "Initial Assessment";
  let finalQuestions = questions.map((q: any, i: number) => ({
    text: q.text,
    options: q.options,
    correct_answer: q.correct_answer || "A",
    marks: q.marks || 1,
    order_index: q.order_index ?? i + 1,
    branch: q.branch || "CS",
    exam_name: q.exam_name || examName,
    image_url: q.image_url || null,
  }));

  if (max_questions && max_questions > 0 && finalQuestions.length > max_questions) {
    finalQuestions = finalQuestions.sort(() => Math.random() - 0.5).slice(0, max_questions);
  }

  if (replace_existing) {
    await supabase.from("questions").delete().eq("exam_name", examName);
  }

  let committed = 0;
  for (let i = 0; i < finalQuestions.length; i += 50) {
    const batch = finalQuestions.slice(i, i + 50);
    const { error } = await supabase.from("questions").insert(batch);
    if (!error) committed += batch.length;
    else console.error("Batch insert error:", error.message);
  }

  return NextResponse.json({ committed, total: finalQuestions.length, exam_name: examName });
}

// Legacy combined handler (kept for backwards compat)
async function handleIngest(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  // If it's multipart, treat as upload
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) return handleIngestUpload(req);
  // Otherwise treat as commit
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

