/**
 * Session polling — reads from KV first (fast), falls back to proxying Python backend.
 * Mirrors backend state into D1+KV so frontend never loses progress.
 */

import type { Env } from "../index";
import { json } from "../index";
import {
	getSessionFromDB,
	updateSessionInDB,
	getProgressFromKV,
	saveProgressToKV,
	saveJobHistory,
} from "../db";

export async function handleSession(sessionId: string, env: Env): Promise<Response> {
	// 1. Check D1 for session existence
	const session = await getSessionFromDB(env, sessionId);
	if (!session) {
		return json({ error: "Session not found" }, 404);
	}

	// 2. If completed or failed, return from D1 + KV directly (no backend call)
	if (session.status === "completed" || session.status === "failed") {
		const kvData = await getProgressFromKV(env, sessionId);
		return json({
			session_id: sessionId,
			user_id: session.user_id,
			status: session.status,
			progress: session.progress,
			original_score: session.original_score,
			final_score: session.final_score,
			paragraphs: kvData?.paragraphs || [],
			result: kvData?.result || null,
			error: session.error,
			created_at: session.created_at,
		});
	}

	// 3. For running/pending — poll the Python backend and mirror state
	const backendJobId = await env.SESSIONS.get(`backend:${sessionId}`);
	if (!backendJobId) {
		return json({
			session_id: sessionId,
			status: session.status,
			progress: 0,
			paragraphs: [],
		});
	}

	try {
		const backendResp = await fetch(`${env.BACKEND_URL}/api/session/${backendJobId}`);
		if (!backendResp.ok) {
			// Backend might have restarted — session may need resume
			return json({
				session_id: sessionId,
				status: "interrupted",
				progress: session.progress,
				message: "Backend unavailable. Use POST /api/session/{id}/resume to continue.",
			});
		}

		const backendData = await backendResp.json() as {
			status: string;
			progress: number;
			paragraphs: any[];
			result: any;
			error: string | null;
		};

		// Mirror to KV for fast subsequent reads
		await saveProgressToKV(env, sessionId, {
			session_id: sessionId,
			status: backendData.status,
			progress: backendData.progress,
			paragraphs: backendData.paragraphs,
			result: backendData.result,
			error: backendData.error,
		});

		// Mirror to D1 for durability
		const d1Update: any = {
			status: backendData.status,
			progress: backendData.progress,
		};

		if (backendData.status === "completed" && backendData.result) {
			d1Update.original_score = backendData.result.original_score;
			d1Update.final_score = backendData.result.final_score;
			d1Update.paragraph_count = backendData.paragraphs?.length || 0;
			d1Update.flagged_count = backendData.paragraphs?.filter(
				(p: any) => p.original_score > 20
			).length || 0;

			// Save to job history
			const startTime = new Date(session.created_at).getTime();
			const duration = (Date.now() - startTime) / 1000;
			await saveJobHistory(env, session.user_id, sessionId, {
				filename: session.filename || undefined,
				domain: session.domain,
				original_score: backendData.result.original_score,
				final_score: backendData.result.final_score,
				paragraph_count: d1Update.paragraph_count,
				flagged_count: d1Update.flagged_count,
				duration_seconds: duration,
			});
		}

		if (backendData.error) {
			d1Update.error = backendData.error;
		}

		await updateSessionInDB(env, sessionId, d1Update);

		return json({
			session_id: sessionId,
			user_id: session.user_id,
			status: backendData.status,
			progress: backendData.progress,
			paragraphs: backendData.paragraphs,
			result: backendData.result,
			error: backendData.error,
			created_at: session.created_at,
		});
	} catch (err) {
		// Network error to backend — return last known state
		const kvData = await getProgressFromKV(env, sessionId);
		return json({
			session_id: sessionId,
			status: "interrupted",
			progress: kvData?.progress || session.progress,
			paragraphs: kvData?.paragraphs || [],
			message: "Backend unreachable. Use POST /api/session/{id}/resume to continue.",
		});
	}
}

export async function handleSessionReport(sessionId: string, env: Env): Promise<Response> {
	const session = await getSessionFromDB(env, sessionId);
	if (!session) {
		return json({ error: "Session not found" }, 404);
	}
	if (session.status !== "completed") {
		return json({ error: `Session is ${session.status}, not completed` }, 409);
	}

	// Proxy to Python backend for PDF generation
	const backendJobId = await env.SESSIONS.get(`backend:${sessionId}`);
	if (!backendJobId) {
		return json({ error: "Backend job mapping not found" }, 404);
	}

	const resp = await fetch(`${env.BACKEND_URL}/api/session/${backendJobId}/report`);
	if (!resp.ok) {
		const err = await resp.text();
		return json({ error: "Report generation failed", detail: err }, resp.status);
	}

	return new Response(resp.body, {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="rewrite_report_${sessionId}.pdf"`,
		},
	});
}
