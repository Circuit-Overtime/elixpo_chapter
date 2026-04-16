/**
 * Auth routes — Elixpo OAuth token exchange + user session management.
 *
 * Flow:
 * 1. Frontend redirects user to Elixpo authorize URL
 * 2. User approves, gets redirected back with ?code=...
 * 3. Frontend POSTs the code here for server-side token exchange
 * 4. Worker exchanges code for tokens, fetches user profile
 * 5. Upserts user in D1, returns user info + internal user ID
 */

import type { Env } from "../index";
import { json } from "../index";
import { upsertOAuthUser, getUserById, getOrCreateUser } from "../db";

const ELIXPO_BASE = "https://accounts.elixpo.com";

export async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
	const body = await request.json() as {
		code: string;
		redirect_uri: string;
		client_id: string;
	};

	if (!body.code) {
		return json({ error: "Authorization code required" }, 400);
	}

	// Exchange code for tokens server-side
	const tokenResp = await fetch(`${ELIXPO_BASE}/oauth/token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: "authorization_code",
			code: body.code,
			redirect_uri: body.redirect_uri,
			client_id: body.client_id,
			client_secret: env.ELIXPO_CLIENT_SECRET,
		}),
	});

	if (!tokenResp.ok) {
		const err = await tokenResp.text();
		return json({ error: "Token exchange failed", detail: err }, tokenResp.status);
	}

	const tokens = await tokenResp.json() as {
		access_token: string;
		token_type: string;
		expires_in: number;
		refresh_token?: string;
	};

	// Fetch user profile
	const profileResp = await fetch(`${ELIXPO_BASE}/api/userinfo`, {
		headers: { Authorization: `Bearer ${tokens.access_token}` },
	});

	if (!profileResp.ok) {
		return json({ error: "Failed to fetch user profile" }, 502);
	}

	const profile = await profileResp.json() as {
		sub: string;
		email: string;
		name: string;
		picture?: string;
	};

	// Upsert in D1
	const userId = await upsertOAuthUser(env, {
		id: profile.sub,
		email: profile.email,
		name: profile.name,
		avatar_url: profile.picture,
	});

	// Store auth token in KV for session validation (24h TTL)
	await env.SESSIONS.put(`auth:${userId}`, JSON.stringify({
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token,
		expires_at: Date.now() + tokens.expires_in * 1000,
	}), { expirationTtl: 86400 });

	return json({
		user_id: userId,
		email: profile.email,
		name: profile.name,
		avatar_url: profile.picture,
		provider: "elixpo",
	});
}

export async function handleAuthMe(request: Request, env: Env): Promise<Response> {
	const userId = request.headers.get("X-User-ID");
	if (!userId) {
		return json({ error: "X-User-ID header required" }, 401);
	}

	const user = await getUserById(env, userId);
	if (!user) {
		return json({ error: "User not found" }, 404);
	}

	return json(user);
}

export async function handleAuthLogout(request: Request, env: Env): Promise<Response> {
	const userId = request.headers.get("X-User-ID");
	if (!userId) {
		return json({ error: "X-User-ID header required" }, 401);
	}

	// Remove auth token from KV
	await env.SESSIONS.delete(`auth:${userId}`);

	return json({ message: "Logged out" });
}
