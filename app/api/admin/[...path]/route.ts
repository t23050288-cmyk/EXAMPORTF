import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-secret") === ADMIN_SECRET || req.headers.get("x-admin-key") === ADMIN_SECRET;
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
  return NextResponse.json(data || []);
}

async function setConfig(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
  const body = await req.json();
  const { exam_title, duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions } = body;
  const { data: existing } = await supabase.from("exam_config").select("id").eq("exam_title", exam_title).single();
  if (existing) {
    await supabase.from("exam_config").update({ duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions }).eq("exam_title", exam_title);
  } else {
    await supabase.from("exam_config").insert({ exam_title, duration_minutes, is_active, marks_per_question, negative_marks, shuffle_questions, total_questions });
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

async function handleIngest(req: NextRequest) {
  if (!isAdmin(req)) return forbidden();
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
    return { text, options: [optA, optB, optC, optD].filter(Boolean), correct_answer: ["A", "B", "C", "D"].includes(correct) ? correct : "A", marks, order_index: i + 1, exam_name: examName, branch };
  }).filter(Boolean) as any[];
  let finalQuestions = countLimit > 0 && questions.length > countLimit ? questions.sort(() => Math.random() - 0.5).slice(0, countLimit) : questions;
  if (!finalQuestions.length) return NextResponse.json({ detail: "No valid questions found." }, { status: 400 });
  let imported = 0;
  for (let i = 0; i < finalQuestions.length; i += 50) {
    const batch = finalQuestions.slice(i, i + 50);
    const { error } = await supabase.from("questions").insert(batch);
    if (!error) imported += batch.length;
  }
  return NextResponse.json({ imported, total: finalQuestions.length, exam_name: examName });
}

// ── ROUTER ────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path?.join("/") || "";
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
  if (path === "ingest" || path === "ingest/upload" || path === "ingest/commit") return handleIngest(req);
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
