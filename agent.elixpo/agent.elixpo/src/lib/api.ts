const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

import type { SessionMeta, SessionDetail, AgentEvent } from "@/types";

export async function fetchSessions(limit = 50): Promise<SessionMeta[]> {
  const res = await fetch(`${API_URL}/api/v1/sessions?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  const data = await res.json();
  return data.sessions;
}

export async function fetchSession(id: string): Promise<SessionDetail> {
  const res = await fetch(`${API_URL}/api/v1/sessions/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Session not found");
  return res.json();
}

export async function createSession(task: string, repo?: string) {
  const res = await fetch(`${API_URL}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, repo }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function resumeSession(id: string, followUp: string) {
  const res = await fetch(`${API_URL}/api/v1/sessions/${id}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ follow_up: followUp }),
  });
  if (!res.ok) throw new Error("Failed to resume session");
  return res.json();
}

export async function deleteSession(id: string) {
  const res = await fetch(`${API_URL}/api/v1/sessions/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
  return res.json();
}

export function connectSessionStream(
  sessionId: string,
  onEvent: (event: AgentEvent) => void,
  onClose?: () => void,
): WebSocket {
  const ws = new WebSocket(`${WS_URL}/api/v1/sessions/${sessionId}/stream`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch {}
  };

  ws.onclose = () => onClose?.();
  ws.onerror = () => onClose?.();

  return ws;
}
