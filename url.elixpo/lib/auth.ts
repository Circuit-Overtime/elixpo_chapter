import { cookies } from 'next/headers';
import { getDB, getKV, getEnv, getOrigin } from './db';
import { generateSessionId, hashApiKey } from './utils';
import type { User, ElixpoUserInfo, OAuthTokenResponse } from './types';

const SESSION_DURATION = 15 * 24 * 60 * 60; // 15 days
const ELIXPO_ACCOUNTS_BASE = 'https://accounts.elixpo.com';

// ─── Get current user from session ──────────────────────────

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;
  if (!sessionId) return null;

  const kv = getKV();
  const db = getDB();

  // KV cache first
  const cachedUserId = await kv.get(`session:${sessionId}`);
  if (cachedUserId) {
    const user = await db
      .prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .bind(parseInt(cachedUserId))
      .first<User>();
    if (user) return user;
  }

  // D1 fallback
  const user = await db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
    )
    .bind(sessionId)
    .first<User>();

  if (!user) return null;

  // Re-cache
  await kv.put(`session:${sessionId}`, String(user.id), { expirationTtl: SESSION_DURATION });
  return user;
}

// ─── Get user from API key (for API routes) ─────────────────

export async function getUserFromApiKey(authHeader: string): Promise<User | null> {
  if (!authHeader.startsWith('Bearer elu_')) return null;

  const key = authHeader.slice(7);
  const keyHash = await hashApiKey(key);
  const db = getDB();

  const row = await db
    .prepare(
      `SELECT ak.id as ak_id, ak.scopes as ak_scopes, u.* FROM api_keys ak JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = ? AND ak.is_active = 1 AND u.is_active = 1
       AND (ak.expires_at IS NULL OR ak.expires_at > datetime('now'))`
    )
    .bind(keyHash)
    .first<any>();

  if (!row) return null;

  // Update last_used_at (fire and forget)
  db.prepare('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?')
    .bind(row.ak_id)
    .run()
    .catch(() => {});

  return {
    id: row.id,
    elixpo_id: row.elixpo_id,
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    role: row.role,
    tier: row.tier,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Resolve user from session or API key ───────────────────

export async function resolveUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer elu_')) {
    return getUserFromApiKey(authHeader);
  }
  return getCurrentUser();
}

// ─── Session management ─────────────────────────────────────

export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000).toISOString();
  const db = getDB();
  const kv = getKV();

  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(sessionId, userId, expiresAt)
    .run();

  await kv.put(`session:${sessionId}`, String(userId), { expirationTtl: SESSION_DURATION });

  const cookieStore = await cookies();
  cookieStore.set('session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION,
  });

  return sessionId;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;
  if (!sessionId) return;

  const db = getDB();
  const kv = getKV();

  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  await kv.delete(`session:${sessionId}`);
  cookieStore.delete('session');
}

// ─── OAuth helpers ──────────────────────────────────────────

export function getAuthorizeUrl(state: string, requestUrl: string): string {
  const env = getEnv();
  const redirectUri = `${getOrigin(requestUrl)}/api/auth/callback`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.NEXT_PUBLIC_ELIXPO_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile email',
  });
  return `${ELIXPO_ACCOUNTS_BASE}/oauth/authorize?${params}`;
}

export async function exchangeCode(code: string, requestUrl: string): Promise<OAuthTokenResponse> {
  const env = getEnv();
  const redirectUri = `${getOrigin(requestUrl)}/api/auth/callback`;
  const payload = {
    grant_type: 'authorization_code',
    code,
    client_id: env.NEXT_PUBLIC_ELIXPO_CLIENT_ID,
    client_secret: env.ELIXPO_CLIENT_SECRET,
    redirect_uri: redirectUri,
  };
  console.log('[exchangeCode] payload:', JSON.stringify(payload));
  console.log('[exchangeCode] url:', `${ELIXPO_ACCOUNTS_BASE}/api/auth/token`);
  const res = await fetch(`${ELIXPO_ACCOUNTS_BASE}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json() as Promise<OAuthTokenResponse>;
}

export async function fetchUserInfo(accessToken: string): Promise<ElixpoUserInfo> {
  const res = await fetch(`${ELIXPO_ACCOUNTS_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json() as Promise<ElixpoUserInfo>;
}

// ─── Upsert user from SSO ───────────────────────────────────

export async function upsertUser(userInfo: ElixpoUserInfo): Promise<User> {
  const db = getDB();

  const existing = await db
    .prepare('SELECT * FROM users WHERE elixpo_id = ?')
    .bind(userInfo.id)
    .first<User>();

  if (existing) {
    await db
      .prepare(`UPDATE users SET email = ?, display_name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(userInfo.email, userInfo.displayName, userInfo.avatar || null, existing.id)
      .run();
    return { ...existing, email: userInfo.email, display_name: userInfo.displayName, avatar_url: userInfo.avatar || null };
  }

  const user = await db
    .prepare(
      `INSERT INTO users (elixpo_id, email, display_name, avatar_url, role)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    )
    .bind(userInfo.id, userInfo.email, userInfo.displayName, userInfo.avatar || null, userInfo.isAdmin ? 'admin' : 'user')
    .first<User>();

  return user!;
}

// ─── Audit logging ──────────────────────────────────────────

export async function auditLog(
  userId: number | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: string
): Promise<void> {
  const db = getDB();
  await db
    .prepare(
      'INSERT INTO audit_log (user_id, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(userId, action, resourceType || null, resourceId || null, details || null)
    .run();
}
