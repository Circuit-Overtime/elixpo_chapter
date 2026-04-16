/**
 * D1 + KV helpers for session, user, and document management.
 * All text content is gzip-compressed before storage.
 */

import type { Env } from "./index";
import { compress, decompress, sha256 } from "./compress";

// ── User management ─────────────────────────────────────────

export async function getOrCreateUser(env: Env, userId?: string): Promise<string> {
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

	const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
	await env.DB.prepare(
		"INSERT INTO users (id, provider) VALUES (?, 'anonymous')"
	).bind(id).run();
	return id;
}

export async function upsertOAuthUser(
	env: Env,
	profile: { id: string; email: string; name: string; avatar_url?: string }
): Promise<string> {
	const existing = await env.DB.prepare(
		"SELECT id FROM users WHERE oauth_provider_id = ? AND provider = 'elixpo'"
	).bind(profile.id).first<{ id: string }>();

	if (existing) {
		await env.DB.prepare(
			`UPDATE users SET email = ?, display_name = ?, avatar_url = ?, last_seen_at = datetime('now')
			 WHERE id = ?`
		).bind(profile.email, profile.name, profile.avatar_url || null, existing.id).run();
		return existing.id;
	}

	const userId = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
	await env.DB.prepare(
		`INSERT INTO users (id, provider, email, display_name, avatar_url, oauth_provider_id)
		 VALUES (?, 'elixpo', ?, ?, ?, ?)`
	).bind(userId, profile.email, profile.name, profile.avatar_url || null, profile.id).run();
	return userId;
}

export async function getUserById(env: Env, userId: string) {
	return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
}

// ── Session management ──────────────────────────────────────

export interface SessionRow {
	id: string;
	user_id: string;
	status: string;
	progress: number;
	original_text_compressed: ArrayBuffer | null;
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

/** Store compressed original text in the session row */
export async function storeSessionText(env: Env, sessionId: string, text: string): Promise<void> {
	const compressed = await compress(text);
	await env.DB.prepare(
		"UPDATE sessions SET original_text_compressed = ?, updated_at = datetime('now') WHERE id = ?"
	).bind(compressed, sessionId).run();
}

/** Retrieve and decompress the original text from a session */
export async function getSessionText(env: Env, sessionId: string): Promise<string | null> {
	const row = await env.DB.prepare(
		"SELECT original_text_compressed FROM sessions WHERE id = ?"
	).bind(sessionId).first<{ original_text_compressed: ArrayBuffer | null }>();
	if (!row?.original_text_compressed) return null;
	return decompress(row.original_text_compressed);
}

export async function getSessionFromDB(env: Env, sessionId: string): Promise<SessionRow | null> {
	return env.DB.prepare("SELECT * FROM sessions WHERE id = ?")
		.bind(sessionId)
		.first<SessionRow>();
}

export async function updateSessionInDB(
	env: Env,
	sessionId: string,
	fields: Record<string, any>
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

// ── KV progress (fast reads for frontend polling) ───────────

export async function getProgressFromKV(env: Env, sessionId: string): Promise<any | null> {
	const raw = await env.SESSIONS.get(`session:${sessionId}`);
	return raw ? JSON.parse(raw) : null;
}

export async function saveProgressToKV(env: Env, sessionId: string, data: any): Promise<void> {
	await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(data), {
		expirationTtl: 86400,
	});
}

// ── Paragraph state ─────────────────────────────────────────

export async function saveParagraphs(
	env: Env,
	sessionId: string,
	paragraphs: Array<{ idx: number; original_text: string; original_score: number }>
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

// ── Document storage (compressed) ───────────────────────────

export async function storeDocument(
	env: Env,
	userId: string,
	sessionId: string | null,
	content: string,
	filename: string | null,
	contentType: string
): Promise<{ id: string; original_size: number; compressed_size: number }> {
	const id = crypto.randomUUID().replace(/-/g, "");
	const originalSize = new TextEncoder().encode(content).byteLength;
	const compressed = await compress(content);
	const checksum = await sha256(content);

	await env.DB.prepare(
		`INSERT INTO documents (id, user_id, session_id, filename, content_type, original_size, compressed_size, content_compressed, checksum)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	).bind(
		id, userId, sessionId, filename, contentType,
		originalSize, compressed.byteLength, compressed, checksum
	).run();

	return { id, original_size: originalSize, compressed_size: compressed.byteLength };
}

export async function getDocument(env: Env, documentId: string): Promise<{ content: string; filename: string | null; content_type: string; original_size: number; compressed_size: number } | null> {
	const row = await env.DB.prepare(
		"SELECT content_compressed, filename, content_type, original_size, compressed_size FROM documents WHERE id = ?"
	).bind(documentId).first<{
		content_compressed: ArrayBuffer;
		filename: string | null;
		content_type: string;
		original_size: number;
		compressed_size: number;
	}>();

	if (!row) return null;
	const content = await decompress(row.content_compressed);
	return {
		content,
		filename: row.filename,
		content_type: row.content_type,
		original_size: row.original_size,
		compressed_size: row.compressed_size,
	};
}

// ── Job history ─────────────────────────────────────────────

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
		userId, sessionId, data.filename || null, data.domain,
		data.original_score, data.final_score, data.paragraph_count,
		data.flagged_count, data.duration_seconds
	).run();
}
