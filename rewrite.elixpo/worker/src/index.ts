/**
 * ReWrite Cloudflare Worker — API gateway
 *
 * Responsibilities:
 * - API key auth for all requests (frontend sends REWRITE_API_KEY)
 * - User management (anonymous guests + Elixpo OAuth)
 * - Session management via D1 (persistent SQL) + KV (fast progress reads)
 * - Document storage with gzip compression in D1
 * - Proxies compute-heavy requests to dockerized Python backend
 */

import { handleDetect, handleDetectFile } from "./routes/detect";
import { handleParaphrase, handleParaphraseFile, handleResume } from "./routes/paraphrase";
import { handleSession, handleSessionReport } from "./routes/sessions";
import { handleUserMe, handleUserHistory } from "./routes/users";
import { handleAuthCallback, handleAuthMe, handleAuthLogout } from "./routes/auth";
import { handleDocumentStore, handleDocumentGet, handleDocumentList } from "./routes/documents";
import { corsHeaders, handleOptions } from "./cors";

export interface Env {
	DB: D1Database;
	SESSIONS: KVNamespace;
	BACKEND_URL: string;
	REWRITE_API_KEY: string;
	ELIXPO_CLIENT_SECRET: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "OPTIONS") {
			return handleOptions();
		}

		const url = new URL(request.url);
		const path = url.pathname;

		// --- API key validation (all routes except health & OPTIONS) ---
		if (path !== "/api/health") {
			const apiKey =
				request.headers.get("X-API-Key") ||
				url.searchParams.get("api_key");
			if (!env.REWRITE_API_KEY || apiKey !== env.REWRITE_API_KEY) {
				return withCors(json({ error: "Unauthorized — invalid API key" }, 401));
			}
		}

		try {
			// --- Auth (Elixpo OAuth) ---
			if (path === "/api/auth/callback" && request.method === "POST") {
				return withCors(await handleAuthCallback(request, env));
			}
			if (path === "/api/auth/me" && request.method === "GET") {
				return withCors(await handleAuthMe(request, env));
			}
			if (path === "/api/auth/logout" && request.method === "POST") {
				return withCors(await handleAuthLogout(request, env));
			}

			// --- Detection (proxied to Python backend) ---
			if (path === "/api/detect" && request.method === "POST") {
				return withCors(await handleDetect(request, env));
			}
			if (path === "/api/detect/file" && request.method === "POST") {
				return withCors(await handleDetectFile(request, env));
			}

			// --- Paraphrase (session-based) ---
			if (path === "/api/paraphrase" && request.method === "POST") {
				return withCors(await handleParaphrase(request, env));
			}
			if (path === "/api/paraphrase/file" && request.method === "POST") {
				return withCors(await handleParaphraseFile(request, env));
			}

			// --- Session polling ---
			const sessionMatch = path.match(/^\/api\/session\/([a-f0-9]+)$/);
			if (sessionMatch && request.method === "GET") {
				return withCors(await handleSession(sessionMatch[1], env));
			}

			// --- Session resume ---
			const resumeMatch = path.match(/^\/api\/session\/([a-f0-9]+)\/resume$/);
			if (resumeMatch && request.method === "POST") {
				return withCors(await handleResume(resumeMatch[1], env));
			}

			// --- Session report download ---
			const reportMatch = path.match(/^\/api\/session\/([a-f0-9]+)\/report$/);
			if (reportMatch && request.method === "GET") {
				return withCors(await handleSessionReport(reportMatch[1], env));
			}

			// --- Documents (compressed storage) ---
			if (path === "/api/documents" && request.method === "POST") {
				return withCors(await handleDocumentStore(request, env));
			}
			if (path === "/api/documents" && request.method === "GET") {
				return withCors(await handleDocumentList(request, env));
			}
			const docMatch = path.match(/^\/api\/documents\/([a-f0-9-]+)$/);
			if (docMatch && request.method === "GET") {
				return withCors(await handleDocumentGet(docMatch[1], env));
			}

			// --- User endpoints ---
			if (path === "/api/user/me" && request.method === "GET") {
				return withCors(await handleUserMe(request, env));
			}
			if (path === "/api/user/history" && request.method === "GET") {
				return withCors(await handleUserHistory(request, env));
			}

			// --- Health ---
			if (path === "/api/health") {
				return withCors(json({ status: "ok", edge: true }));
			}

			return withCors(json({ error: "Not found" }, 404));
		} catch (err: any) {
			console.error("Worker error:", err);
			return withCors(json({ error: "Internal server error", detail: err.message }, 500));
		}
	},
};

// --- Helpers ---

export function json(data: any, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function withCors(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders)) {
		headers.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
