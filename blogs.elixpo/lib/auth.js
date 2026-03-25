import { cookies } from 'next/headers';
import { getDB } from './cloudflare';

const SESSION_COOKIE = 'lixblogs_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 15; // 15 days

export function getOAuthConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID,
    clientSecret: process.env.ELIXPO_CLIENT_SECRET,
    authorizeUrl: 'https://accounts.elixpo.com/oauth/authorize',
    tokenUrl: 'https://accounts.elixpo.com/api/auth/token',
    userInfoUrl: 'https://accounts.elixpo.com/api/auth/me',
    redirectUri: (process.env.NEXT_PUBLIC_URL || 'https://localhost:3000') + '/api/auth/callback',
    scope: 'openid profile email',
  };
}

export async function setSessionCookie(tokenData, userId) {
  const cookieStore = await cookies();
  const session = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
    userId,
  });

  cookieStore.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getUser() {
  const session = await getSession();
  if (!session || !session.userId) return null;

  const config = getOAuthConfig();

  // If access token expired, try refresh
  if (Date.now() >= session.expiresAt) {
    const refreshed = await refreshAccessToken(session.refreshToken);
    if (!refreshed) {
      await clearSession();
      return null;
    }
    await setSessionCookie(refreshed, session.userId);
  }

  // Fetch user from D1
  const db = getDB();
  const user = await db.prepare(`
    SELECT id, email, username, display_name, bio, avatar_url, avatar_r2_key, banner_r2_key, locale, created_at, updated_at
    FROM users WHERE id = ?
  `).bind(session.userId).first();

  if (!user) {
    await clearSession();
    return null;
  }

  return user;
}

async function refreshAccessToken(refreshToken) {
  const config = getOAuthConfig();

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    }),
  });

  if (!res.ok) return null;
  return res.json();
}
