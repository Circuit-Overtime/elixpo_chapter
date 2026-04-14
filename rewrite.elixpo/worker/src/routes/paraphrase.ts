/**
 * Paraphrase routes — session-based with D1/KV state management.
 * All document text is gzip-compressed before D1 storage.
 *
 * Flow:
 * 1. Frontend POSTs text -> Worker creates session in D1, compresses & stores text, proxies to Python
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
	getSessionText,
	storeSessionText,
	updateSessionInDB,
	saveProgressToKV,
	storeDocument,
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

	const userIdHeader = request.headers.get("X-User-ID") || undefined;
	const userId = await getOrCreateUser(env, userIdHeader);

	const sessionId = await createSession(env, userId, {
		domain: body.domain || "general",
		intensity: body.intensity || "aggressive",
	});

	// Compress and store original text in session + documents table
	await storeSessionText(env, sessionId, body.text);
	await storeDocument(env, userId, sessionId, body.text, null, "text/plain");

	await updateSessionInDB(env, sessionId, { status: "pending" });

	// Proxy to Python backend
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
		await updateSessionInDB(env, sessionId, { status: "failed", error: err });
		return json({ error: "Backend error", detail: err }, backendResp.status);
	}

	const backendData = await backendResp.json() as { job_id: string };

	await env.SESSIONS.put(`backend:${sessionId}`, backendData.job_id, {
		expirationTtl: 86400,
	});

	await updateSessionInDB(env, sessionId, { status: "running" });

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

	// Read file content for compressed storage
	const fileContent = await file.text();
	await storeSessionText(env, sessionId, fileContent);
	await storeDocument(env, userId, sessionId, fileContent, file.name, file.type || "text/plain");

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
		await updateSessionInDB(env, sessionId, { status: "failed", error: err });
		return json({ error: "Backend error", detail: err }, backendResp.status);
	}

	const backendData = await backendResp.json() as { job_id: string };
	await env.SESSIONS.put(`backend:${sessionId}`, backendData.job_id, {
		expirationTtl: 86400,
	});
	await updateSessionInDB(env, sessionId, { status: "running" });

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

	// Decompress original text for re-submission
	const originalText = await getSessionText(env, sessionId);
	if (!originalText) {
		return json({ error: "Session has no text to resume" }, 422);
	}

	const backendResp = await fetch(`${env.BACKEND_URL}/api/paraphrase`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			text: originalText,
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
	await updateSessionInDB(env, sessionId, { status: "running", error: null });

	return json({ message: "Resumed", session_id: sessionId });
}
