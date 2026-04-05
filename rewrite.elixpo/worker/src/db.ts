/**
 * D1 + KV helpers for session and user management.
 */

import type { Env } from "./index";

// --- User management ---

export async function getOrCreateUser(env: Env, userId?: string): Promise<string> {
	// If userId provided, verify it exists
	if (userId) {
		const existing = await env.DB.prepare("SELECT id FROM users WHERE id = ?")
			.bind(userId)
			.first<{ id: string }>();
		if (existing) {
			await env.DB.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?")
				.bind(userId)
				.run();
			return existing.id;
		}
	}

	// Create anonymous user
	const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
	await env.DB.prepare(
		"INSERT INTO users (id, provider) VALUES (?, 'anonymous')"
	).bind(id).run();
	return id;
}

// --- Session management ---

export interface SessionRow {
	id: string;
	user_id: string;
	status: string;
	progress: number;
	original_text: string | null;
	filename: string | null;
	domain: string;
	intensity: string;
	paragraph_count: number;
	flagged_count: number;
	original_score: number | null;
	final_score: number | null;
	error: string | null;
	created_at: string;
	updated_at: string;
}

export async function createSession(
	env: Env,
	userId: string,
	opts: { domain: string; intensity: string; filename?: string }
): Promise<string> {
	const sessionId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
	await env.DB.prepare(
		`INSERT INTO sessions (id, user_id, domain, intensity, filename)
		 VALUES (?, ?, ?, ?, ?)`
	).bind(sessionId, userId, opts.domain, opts.intensity, opts.filename || null).run();

	// Initialize KV with empty progress for fast reads
	await env.SESSIONS.put(
		`session:${sessionId}`,
		JSON.stringify({
			session_id: sessionId,
			status: "pending",
			progress: 0,
			paragraphs: [],
			result: null,
			error: null,
		}),
		{ expirationTtl: 86400 }
	);

	return sessionId;
}

export async function getSessionFromDB(env: Env, sessionId: string): Promise<SessionRow | null> {
	return env.DB.prepare("SELECT * FROM sessions WHERE id = ?")
		.bind(sessionId)
		.first<SessionRow>();
}

export async function updateSessionInDB(
	env: Env,
	sessionId: string,
	fields: Partial<SessionRow>
): Promise<void> {
	const sets: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(fields)) {
		if (key === "id") continue;
		sets.push(`${key} = ?`);
		values.push(value);
	}
	sets.push("updated_at = datetime('now')");
	values.push(sessionId);

	await env.DB.prepare(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`)
		.bind(...values)
		.run();
}

// --- KV progress (fast reads for frontend polling) ---

export async function getProgressFromKV(env: Env, sessionId: string): Promise<any | null> {
	const raw = await env.SESSIONS.get(`session:${sessionId}`);
	return raw ? JSON.parse(raw) : null;
}

export async function saveProgressToKV(env: Env, sessionId: string, data: any): Promise<void> {
	await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(data), {
		expirationTtl: 86400,
	});
}

// --- Paragraph state ---

export async function saveParagraphs(
	env: Env,
	sessionId: string,
	paragraphs: Array<{
		idx: number;
		original_text: string;
		original_score: number;
	}>
): Promise<void> {
	const stmt = env.DB.prepare(
		`INSERT OR REPLACE INTO paragraphs (session_id, idx, original_text, original_score, status)
		 VALUES (?, ?, ?, ?, 'pending')`
	);
	const batch = paragraphs.map((p) =>
		stmt.bind(sessionId, p.idx, p.original_text, p.original_score)
	);
	await env.DB.batch(batch);
}

export async function updateParagraph(
	env: Env,
	sessionId: string,
	idx: number,
	fields: { rewritten_text?: string; current_score?: number; status?: string; attempts?: number }
): Promise<void> {
	const sets: string[] = [];
	const values: any[] = [];

	for (const [key, value] of Object.entries(fields)) {
		sets.push(`${key} = ?`);
		values.push(value);
	}
	sets.push("updated_at = datetime('now')");
	values.push(sessionId);
	values.push(idx);

	await env.DB.prepare(
		`UPDATE paragraphs SET ${sets.join(", ")} WHERE session_id = ? AND idx = ?`
	).bind(...values).run();
}

export async function getParagraphs(env: Env, sessionId: string) {
	const { results } = await env.DB.prepare(
		"SELECT * FROM paragraphs WHERE session_id = ? ORDER BY idx"
	).bind(sessionId).all();
	return results || [];
}

// --- Job history ---

export async function saveJobHistory(
	env: Env,
	userId: string,
	sessionId: string,
	data: {
		filename?: string;
		domain: string;
		original_score: number;
		final_score: number;
		paragraph_count: number;
		flagged_count: number;
		duration_seconds: number;
	}
): Promise<void> {
	await env.DB.prepare(
		`INSERT INTO job_history (user_id, session_id, filename, domain, original_score, final_score, paragraph_count, flagged_count, duration_seconds)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		userId,
		sessionId,
		data.filename || null,
		data.domain,
		data.original_score,
		data.final_score,
		data.paragraph_count,
		data.flagged_count,
		data.duration_seconds
	).run();
}
