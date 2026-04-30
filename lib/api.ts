const API_BASE = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("exam_token");
}

const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "admin@examguard2024";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isPreview = typeof window !== "undefined" && sessionStorage.getItem("exam_preview") === "true";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isPreview ? { "X-Admin-Secret": ADMIN_SECRET } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    sessionStorage.removeItem("exam_token");
    sessionStorage.removeItem("exam_student");
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────
export interface LoginResponse {
  access_token: string;
  student_id: string;
  student_name: string;
  email: string;
  branch: string;
  exam_start_time: string | null;
  exam_duration_minutes: number;
  exam_title: string;
  total_questions: number;
}

export async function loginStudent(
  usn: string, password: string,
  profile?: { name?: string; email?: string; branch?: string }
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ usn, password, ...profile }),
  });
}

export async function logoutStudent(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  sessionStorage.removeItem("exam_token");
  sessionStorage.removeItem("exam_student");
}

// ── Exam ──────────────────────────────────────────────────────
export interface Question {
  id: string;
  text: string;
  options: string[];
  marks: number;
  image_url?: string;
  order_index: number;
  branch: string;
  exam_name: string;
}

export async function fetchQuestions(title: string): Promise<Question[]> {
  const data = await apiFetch<{ questions: Question[] }>(`/exam/questions?title=${encodeURIComponent(title)}`);
  return data.questions;
}

export async function startExam(title: string): Promise<{ started_at: string }> {
  return apiFetch("/exam/start", { method: "POST", body: JSON.stringify({ title }) });
}

export async function saveAnswer(questionId: string, answer: string, examTitle?: string): Promise<void> {
  await apiFetch("/exam/save-answer", {
    method: "POST",
    body: JSON.stringify({ question_id: questionId, answer, exam_title: examTitle }),
  });
}

export interface SubmitResponse {
  score: number;
  total_marks: number;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
}

export async function submitExam(answers: Record<string, string>, examTitle: string): Promise<SubmitResponse> {
  return apiFetch<SubmitResponse>("/exam/submit", {
    method: "POST",
    body: JSON.stringify({ answers, exam_title: examTitle }),
  });
}

// ── Violations ────────────────────────────────────────────────
export interface ViolationResponse {
  total_violations: number;
  warning_count: number;
  message: string;
  auto_submitted?: boolean;
}

export async function reportViolation(type: string, metadata?: Record<string, any>): Promise<ViolationResponse> {
  return apiFetch<ViolationResponse>("/violations/report", {
    method: "POST",
    body: JSON.stringify({ type, metadata }),
  });
}

// ── Admin ─────────────────────────────────────────────────────
function adminHeaders() {
  return { "X-Admin-Secret": ADMIN_SECRET };
}

export interface AdminQuestion {
  id: string; text: string; options: string[]; correct_answer: string;
  marks: number; order_index: number; branch: string; exam_name: string; image_url?: string;
}

export async function fetchAdminQuestions(): Promise<AdminQuestion[]> {
  const data = await apiFetch<{ folders: any[]; total: number }>("/admin/questions", { headers: adminHeaders() });
  // Flatten folders into a single questions array
  const all: AdminQuestion[] = [];
  data.folders?.forEach((f: any) => {
    f.questions?.forEach((q: any) => all.push(q));
  });
  return all;
}

export async function fetchAdminQuestionFolders(): Promise<{ folders: any[]; total: number }> {
  return apiFetch("/admin/questions", { headers: adminHeaders() });
}

export async function createAdminQuestion(data: Partial<AdminQuestion>): Promise<void> {
  await apiFetch("/admin/questions", { method: "POST", body: JSON.stringify(data), headers: adminHeaders() });
}

export async function updateAdminQuestion(id: string, data: Partial<AdminQuestion>): Promise<void> {
  await apiFetch(`/admin/questions/${id}`, { method: "PUT", body: JSON.stringify(data), headers: adminHeaders() });
}

export async function deleteAdminQuestion(id: string): Promise<void> {
  await apiFetch(`/admin/questions/${id}`, { method: "DELETE", headers: adminHeaders() });
}

export interface AdminStudent {
  id: string;
  student_id: string;
  usn: string;
  name: string;
  email: string;
  branch: string;
  status: string;
  score: number;
  total_marks: number;
  warnings: number;
  started_at?: string | null;
  submitted_at?: string | null;
  last_active: string | null;
  current_question?: number | null;
}

export async function fetchAdminStudents(): Promise<AdminStudent[]> {
  return apiFetch("/admin/students", { headers: adminHeaders() });
}

export async function createAdminStudent(data: { usn: string; name: string; email: string; branch: string; password: string }): Promise<void> {
  await apiFetch("/admin/students", { method: "POST", body: JSON.stringify(data), headers: adminHeaders() });
}

export async function updateAdminStudent(id: string, data: Partial<AdminStudent & { password?: string }>): Promise<void> {
  await apiFetch(`/admin/students/${id}`, { method: "PUT", body: JSON.stringify(data), headers: adminHeaders() });
}

export async function deleteAdminStudent(id: string): Promise<void> {
  await apiFetch(`/admin/students/${id}`, { method: "DELETE", headers: adminHeaders() });
}

export async function resetAdminStudent(id: string): Promise<void> {
  await apiFetch(`/admin/students/${id}/reset`, { method: "POST", headers: adminHeaders() });
}

export async function forceSubmitAdminStudent(id: string): Promise<{ score: number }> {
  return apiFetch(`/admin/students/${id}/force-submit`, { method: "POST", headers: adminHeaders() });
}

export interface ExamConfig {
  id?: string; exam_title: string; duration_minutes: number; is_active: boolean;
  marks_per_question: number; negative_marks: number; shuffle_questions: boolean;
  total_questions: number; scheduled_start?: string | null; updated_at?: string;
}

export async function fetchExamConfig(title?: string): Promise<ExamConfig> {
  const configs = await apiFetch<ExamConfig[]>("/admin/config", { headers: adminHeaders() });
  if (title) return configs.find((c: any) => c.exam_title === title) as ExamConfig || configs[0];
  return configs[0];
}

export async function fetchPublicExamConfig(): Promise<ExamConfig[]> {
  return apiFetch<ExamConfig[]>("/public/exam-config");
}

export async function updateExamConfig(data: Partial<ExamConfig>): Promise<void> {
  await apiFetch("/admin/config", { method: "POST", body: JSON.stringify(data), headers: adminHeaders() });
}

export async function cleanupStaleSessions(): Promise<{ count: number }> {
  return { count: 0 }; // placeholder
}

export async function deleteAdminFolder(folderName: string): Promise<void> {
  // Delete all questions with this exam_name
  await apiFetch(`/admin/questions?folder=${encodeURIComponent(folderName)}`, { method: "DELETE", headers: adminHeaders() });
}

export async function renameAdminFolder(oldName: string, newName: string): Promise<void> {
  await apiFetch("/admin/questions/rename-folder", { method: "POST", body: JSON.stringify({ old_name: oldName, new_name: newName }), headers: adminHeaders() });
}

export async function editAdminFolderBranch(folderName: string, newBranch: string): Promise<void> {
  await apiFetch("/admin/questions/edit-folder-branch", { method: "POST", body: JSON.stringify({ folder_name: folderName, new_branch: newBranch }), headers: adminHeaders() });
}

export async function uploadQuestionImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/admin/upload-image`, {
    method: "POST",
    headers: { "X-Admin-Secret": ADMIN_SECRET },
    body: fd,
  });
  const data = await res.json();
  return data.url;
}

export async function exportResults(branch?: string): Promise<Blob> {
  const url = branch ? `${API_BASE}/admin/export?branch=${encodeURIComponent(branch)}` : `${API_BASE}/admin/export`;
  const res = await fetch(url, {
    headers: { "X-Admin-Secret": ADMIN_SECRET },
  });
  return res.blob();
}

export interface BranchExamSummary {
  branch: string;
  exam_name: string;
  count?: number;
  question_count?: number;
}

export async function fetchBranchExamSummary(): Promise<BranchExamSummary[]> {
  const data = await apiFetch<{ folders: any[]; total: number }>("/admin/questions", { headers: adminHeaders() });
  return (data.folders || []).map((f: any) => ({
    branch: f.branch || "CS",
    exam_name: f.name || "Unknown",
    count: f.questions?.length || 0,
  }));
}
