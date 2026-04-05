import { cookies } from 'next/headers';

const SESSION_COOKIE = 'lixblogs_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 15; // 15 days

export function getOAuthConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID,
    clientSecret: process.env.ELIXPO_CLIENT_SECRET,
    authorizeUrl: 'https://accounts.elixpo.com/oauth/authorize',
    tokenUrl: 'https://accounts.elixpo.com/api/auth/token',
    userInfoUrl: 'https://accounts.elixpo.com/api/auth/me',
    redirectUri: null, // set dynamically per-request from the request URL
    scope: 'openid profile email',
  };
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
