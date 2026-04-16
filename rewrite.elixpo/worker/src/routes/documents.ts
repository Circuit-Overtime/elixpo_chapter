/**
 * Document routes — compressed storage and retrieval.
 *
 * Every document that touches the platform (paste, file upload, guest or signed-in)
 * gets gzip-compressed and stored in D1 as a BLOB.
 */

import type { Env } from "../index";
import { json } from "../index";
import { getOrCreateUser, storeDocument, getDocument } from "../db";

export async function handleDocumentStore(request: Request, env: Env): Promise<Response> {
	const body = await request.json() as {
		content: string;
		filename?: string;
		content_type?: string;
		session_id?: string;
	};

	if (!body.content || body.content.length === 0) {
		return json({ error: "Content required" }, 400);
	}

	const userIdHeader = request.headers.get("X-User-ID") || undefined;
	const userId = await getOrCreateUser(env, userIdHeader);

	const result = await storeDocument(
		env,
		userId,
		body.session_id || null,
		body.content,
		body.filename || null,
		body.content_type || "text/plain"
	);

	const ratio = ((1 - result.compressed_size / result.original_size) * 100).toFixed(1);

	return json({
		document_id: result.id,
		original_size: result.original_size,
		compressed_size: result.compressed_size,
		compression_ratio: `${ratio}%`,
		user_id: userId,
	}, 201);
}

export async function handleDocumentGet(documentId: string, env: Env): Promise<Response> {
	const doc = await getDocument(env, documentId);
	if (!doc) {
		return json({ error: "Document not found" }, 404);
	}

	const ratio = ((1 - doc.compressed_size / doc.original_size) * 100).toFixed(1);

	return json({
		document_id: documentId,
		content: doc.content,
		filename: doc.filename,
		content_type: doc.content_type,
		original_size: doc.original_size,
		compressed_size: doc.compressed_size,
		compression_ratio: `${ratio}%`,
	});
}

export async function handleDocumentList(request: Request, env: Env): Promise<Response> {
	const userId = request.headers.get("X-User-ID");
	if (!userId) {
		return json({ error: "X-User-ID header required" }, 401);
	}

	const limit = parseInt(new URL(request.url).searchParams.get("limit") || "20");
	const offset = parseInt(new URL(request.url).searchParams.get("offset") || "0");

	const { results } = await env.DB.prepare(
		`SELECT id, session_id, filename, content_type, original_size, compressed_size, created_at
		 FROM documents WHERE user_id = ?
		 ORDER BY created_at DESC LIMIT ? OFFSET ?`
	).bind(userId, Math.min(limit, 50), offset).all();

	const total = await env.DB.prepare(
		"SELECT COUNT(*) as count FROM documents WHERE user_id = ?"
	).bind(userId).first<{ count: number }>();

	return json({
		documents: (results || []).map((d: any) => ({
			...d,
			compression_ratio: `${((1 - d.compressed_size / d.original_size) * 100).toFixed(1)}%`,
		})),
		total: total?.count || 0,
		limit,
		offset,
	});
}
