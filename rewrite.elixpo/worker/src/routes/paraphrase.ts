/**
 * Paraphrase routes — session-based with D1/KV state management.
 *
 * Flow:
 * 1. Frontend POSTs text -> Worker creates session in D1, stores in KV, proxies to Python
 * 2. Python backend runs the job, writes progress to its Redis
 * 3. Worker polls Python backend on session reads and mirrors state to KV
 * 4. Frontend polls Worker's KV for fast progress reads
 * 5. On crash: frontend calls /resume with same session_id
 */

import type { Env } from "../index";
import { json } from "../index";
import {
	getOrCreateUser,
	createSession,
	getSessionFromDB,
	updateSessionInDB,
	saveProgressToKV,
	getProgressFromKV,
} from "../db";

export async function handleParaphrase(request: Request, env: Env): Promise<Response> {
	const body = await request.json() as {
		text: string;
		intensity?: string;
		domain?: string;
	};

	if (!body.text || body.text.trim().length < 50) {
		return json({ error: "Text must be at least 50 characters" }, 422);
	}
	if (body.text.length > 100_000) {
		return json({ error: "Text must be under 100,000 characters" }, 422);
	}

	// Get or create user from header
	const userIdHeader = request.headers.get("X-User-ID") || undefined;
	const userId = await getOrCreateUser(env, userIdHeader);

	// Create session in D1
	const sessionId = await createSession(env, userId, {
		domain: body.domain || "general",
		intensity: body.intensity || "aggressive",
	});

	// Store original text in D1
	await updateSessionInDB(env, sessionId, {
		original_text: body.text.slice(0, 100_000),
		status: "pending",
	} as any);

	// Proxy to Python backend — it creates its own Redis session with the same ID
	const backendResp = await fetch(`${env.BACKEND_URL}/api/paraphrase`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: body.text,
			intensity: body.intensity || "aggressive",
			domain: body.domain || "general",
		}),
	});

	if (!backendResp.ok) {
		const err = await backendResp.text();
		await updateSessionInDB(env, sessionId, { status: "failed", error: err } as any);
		return json({ error: "Backend error", detail: err }, backendResp.status);
	}

	const backendData = await backendResp.json() as { job_id: string };

	// Store the backend job_id mapping in KV for fast lookup
	await env.SESSIONS.put(`backend:${sessionId}`, backendData.job_id, {
		expirationTtl: 86400,
	});

	await updateSessionInDB(env, sessionId, { status: "running" } as any);

	return json({
		session_id: sessionId,
		user_id: userId,
		status: "running",
	});
}

export async function handleParaphraseFile(request: Request, env: Env): Promise<Response> {
	const formData = await request.formData();
	const file = formData.get("file") as File | null;

	if (!file) {
		return json({ error: "File required" }, 400);
	}
	if (file.size > 10 * 1024 * 1024) {
		return json({ error: "File too large. Max 10 MB" }, 413);
	}

	const userIdHeader = request.headers.get("X-User-ID") || undefined;
	const userId = await getOrCreateUser(env, userIdHeader);

	const sessionId = await createSession(env, userId, {
		domain: (formData.get("domain") as string) || "general",
		intensity: (formData.get("intensity") as string) || "aggressive",
		filename: file.name,
	});

	// Forward file to Python backend
	const proxyForm = new FormData();
	proxyForm.append("file", file);
	proxyForm.append("domain", (formData.get("domain") as string) || "general");
	proxyForm.append("intensity", (formData.get("intensity") as string) || "aggressive");

	const backendResp = await fetch(`${env.BACKEND_URL}/api/paraphrase/file`, {
		method: "POST",
		body: proxyForm,
	});

	if (!backendResp.ok) {
		const err = await backendResp.text();
		await updateSessionInDB(env, sessionId, { status: "failed", error: err } as any);
		return json({ error: "Backend error", detail: err }, backendResp.status);
	}

	const backendData = await backendResp.json() as { job_id: string };
	await env.SESSIONS.put(`backend:${sessionId}`, backendData.job_id, {
		expirationTtl: 86400,
	});
	await updateSessionInDB(env, sessionId, { status: "running" } as any);

	return json({
		session_id: sessionId,
		user_id: userId,
		status: "running",
	});
}

export async function handleResume(sessionId: string, env: Env): Promise<Response> {
	const session = await getSessionFromDB(env, sessionId);
	if (!session) {
		return json({ error: "Session not found" }, 404);
	}

	if (session.status === "completed") {
		return json({ message: "Already completed", session_id: sessionId });
	}

	if (session.status === "running") {
		// Check if backend job is actually still running
		const backendJobId = await env.SESSIONS.get(`backend:${sessionId}`);
		if (backendJobId) {
			const checkResp = await fetch(`${env.BACKEND_URL}/api/session/${backendJobId}`);
			if (checkResp.ok) {
				const checkData = await checkResp.json() as { status: string };
				if (checkData.status === "running") {
					return json({ message: "Still running", session_id: sessionId });
				}
			}
		}
	}

	// Re-send to Python backend for resume
	if (!session.original_text) {
		return json({ error: "Session has no text to resume" }, 422);
	}

	const backendResp = await fetch(`${env.BACKEND_URL}/api/paraphrase`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: session.original_text,
			intensity: session.intensity,
			domain: session.domain,
		}),
	});

	if (!backendResp.ok) {
		return json({ error: "Resume failed" }, 500);
	}

	const backendData = await backendResp.json() as { job_id: string };
	await env.SESSIONS.put(`backend:${sessionId}`, backendData.job_id, {
		expirationTtl: 86400,
	});
	await updateSessionInDB(env, sessionId, { status: "running", error: null } as any);

	return json({ message: "Resumed", session_id: sessionId });
}
