/**
 * API client for ReWrite backend (via Cloudflare Worker).
 *
 * Session IDs are stored in localStorage so they survive reloads.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- User ID (anonymous, persisted in localStorage) ---

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let userId = localStorage.getItem("rewrite_user_id");
  if (!userId) {
    userId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    localStorage.setItem("rewrite_user_id", userId);
  }
  return userId;
}

// --- Session persistence ---

export function getActiveSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rewrite_session_id");
}

export function setActiveSessionId(sessionId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("rewrite_session_id", sessionId);
  }
}

export function clearActiveSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("rewrite_session_id");
  }
}

// --- API helpers ---

async function apiFetch(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    "X-User-ID": getUserId(),
    ...(init?.headers as Record<string, string> || {}),
  };

  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!resp.ok) {
    const body = await resp.text();
    let detail: string;
    try {
      detail = JSON.parse(body).detail || JSON.parse(body).error || body;
    } catch {
      detail = body;
    }
    throw new Error(detail);
  }

  return resp;
}

// --- Detection ---

export interface DetectResult {
  score: number;
  verdict: string;
  features: Record<string, number>;
  segments: Array<{ index: number; text: string; score: number; verdict: string }>;
}

export async function detectText(text: string, segments = false): Promise<DetectResult> {
  const resp = await apiFetch("/api/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, segments, use_llm_judge: true }),
  });
  return resp.json();
}

export async function detectFile(file: File, segments = false): Promise<DetectResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("segments", String(segments));
  const resp = await apiFetch("/api/detect/file", { method: "POST", body: form });
  return resp.json();
}

// --- Paraphrase ---

export interface ParaphraseStartResult {
  session_id?: string;
  job_id?: string;
  user_id?: string;
  status: string;
}

export async function startParaphrase(
  text: string,
  domain = "general",
  intensity = "aggressive"
): Promise<ParaphraseStartResult> {
  const resp = await apiFetch("/api/paraphrase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, domain, intensity }),
  });
  const data = await resp.json();
  const sessionId = data.session_id || data.job_id;
  if (sessionId) setActiveSessionId(sessionId);
  return data;
}

export async function startParaphraseFile(
  file: File,
  domain = "general",
  intensity = "aggressive"
): Promise<ParaphraseStartResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("domain", domain);
  form.append("intensity", intensity);
  const resp = await apiFetch("/api/paraphrase/file", { method: "POST", body: form });
  const data = await resp.json();
  const sessionId = data.session_id || data.job_id;
  if (sessionId) setActiveSessionId(sessionId);
  return data;
}

// --- Session polling ---

export interface ParagraphProgress {
  index: number;
  original_score: number;
  current_score: number | null;
  status: string;
}

export interface SessionState {
  session_id: string;
  status: "pending" | "running" | "completed" | "failed" | "interrupted";
  progress: number;
  paragraphs: ParagraphProgress[];
  result: {
    rewritten: string;
    original_score: number;
    final_score: number;
  } | null;
  error: string | null;
  message?: string;
}

export async function pollSession(sessionId: string): Promise<SessionState> {
  // Try /api/session/ first (Cloudflare Worker), fall back to /api/job/ (direct Python)
  try {
    const resp = await apiFetch(`/api/session/${sessionId}`);
    return resp.json();
  } catch {
    const resp = await apiFetch(`/api/job/${sessionId}`);
    const data = await resp.json();
    return { session_id: sessionId, ...data };
  }
}

export async function resumeSession(sessionId: string): Promise<any> {
  const resp = await apiFetch(`/api/session/${sessionId}/resume`, { method: "POST" });
  return resp.json();
}

export function getReportUrl(sessionId: string): string {
  return `${API_BASE}/api/session/${sessionId}/report`;
}

// --- SSE streaming ---

export function streamSession(
  sessionId: string,
  onProgress: (data: SessionState) => void,
  onDone: (data: SessionState) => void,
  onError: (error: string) => void,
): () => void {
  const url = `${API_BASE}/api/session/${sessionId}/stream`;
  const es = new EventSource(url);

  es.addEventListener("progress", (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    onProgress({ session_id: sessionId, ...data });
  });

  es.addEventListener("done", (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    onDone({ session_id: sessionId, ...data });
    es.close();
  });

  es.addEventListener("error", (e) => {
    if (e instanceof MessageEvent) {
      const data = JSON.parse(e.data);
      onError(data.error || "Stream error");
    } else {
      onError("Connection lost");
    }
    es.close();
  });

  // Return cleanup function
  return () => es.close();
}

// --- Auth helpers ---

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rewrite_auth_token");
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("rewrite_auth_token", token);
  }
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("rewrite_auth_token");
    localStorage.removeItem("rewrite_user_id");
    localStorage.removeItem("rewrite_user");
  }
}

export function getStoredUser(): { id: string; email: string; displayName: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("rewrite_user");
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUser(user: { id: string; email: string; displayName: string }) {
  if (typeof window !== "undefined") {
    localStorage.setItem("rewrite_user", JSON.stringify(user));
  }
}

export function isLoggedIn(): boolean {
  return getAuthToken() !== null;
}

// --- Guest usage tracking ---

export function getGuestUsageToday(): number {
  if (typeof window === "undefined") return 0;
  const key = `rewrite_guest_usage_${new Date().toISOString().slice(0, 10)}`;
  return parseInt(localStorage.getItem(key) || "0");
}

export function incrementGuestUsage() {
  if (typeof window === "undefined") return;
  const key = `rewrite_guest_usage_${new Date().toISOString().slice(0, 10)}`;
  const current = parseInt(localStorage.getItem(key) || "0");
  localStorage.setItem(key, String(current + 1));
}
