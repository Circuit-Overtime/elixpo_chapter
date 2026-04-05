/**
 * User endpoints — profile and history.
 */

import type { Env } from "../index";
import { json } from "../index";
import { getOrCreateUser } from "../db";

export async function handleUserMe(request: Request, env: Env): Promise<Response> {
	const userId = request.headers.get("X-User-ID");
	if (!userId) {
		return json({ error: "X-User-ID header required" }, 401);
	}

	const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?")
		.bind(userId)
		.first();

	if (!user) {
		return json({ error: "User not found" }, 404);
	}

	// Get active session count
	const active = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND status IN ('pending', 'running')"
	).bind(userId).first<{ count: number }>();

	// Get total completed
	const completed = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND status = 'completed'"
	).bind(userId).first<{ count: number }>();

	return json({
		...user,
		active_sessions: active?.count || 0,
		completed_sessions: completed?.count || 0,
	});
}

export async function handleUserHistory(request: Request, env: Env): Promise<Response> {
	const userId = new URL(request.url).searchParams.get("user_id")
		|| request.headers.get("X-User-ID");

	if (!userId) {
		return json({ error: "user_id required" }, 401);
	}

	const limit = parseInt(new URL(request.url).searchParams.get("limit") || "20");
	const offset = parseInt(new URL(request.url).searchParams.get("offset") || "0");

	const { results } = await env.DB.prepare(
		`SELECT h.*, s.filename, s.domain
		 FROM job_history h
		 LEFT JOIN sessions s ON h.session_id = s.id
		 WHERE h.user_id = ?
		 ORDER BY h.created_at DESC
		 LIMIT ? OFFSET ?`
	).bind(userId, Math.min(limit, 50), offset).all();

	const total = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM job_history WHERE user_id = ?"
	).bind(userId).first<{ count: number }>();

	return json({
		history: results || [],
		total: total?.count || 0,
		limit,
		offset,
	});
}
