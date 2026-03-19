const ACCOUNTS_BASE = 'https://accounts.elixpo.com';
const CLIENT_ID = process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID || '';
const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : '';

const SESSION_DURATION = 15 * 24 * 60 * 60 * 1000; // 15 days

export function getSignInUrl() {
  const state = crypto.randomUUID();
  if (typeof window !== 'undefined') sessionStorage.setItem('oauth_state', state);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: 'openid profile email',
  });
  return `${ACCOUNTS_BASE}/oauth/authorize?${params}`;
}

export async function exchangeCode(code) {
  const res = await fetch(`${ACCOUNTS_BASE}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json();
}

export async function fetchUser(accessToken) {
  const res = await fetch(`${ACCOUNTS_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function refreshToken(token) {
  const res = await fetch(`${ACCOUNTS_BASE}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: token,
      client_id: CLIENT_ID,
    }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json();
}

// Persistence — 15-day session
export function saveAuth(tokens, user) {
  const data = { ...tokens, user, savedAt: Date.now() };
  localStorage.setItem('elixpo_auth', JSON.stringify(data));
}

export function getAuth() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('elixpo_auth');
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 15 days
    if (Date.now() - (data.savedAt || 0) > SESSION_DURATION) {
      clearAuth();
      return null;
    }
    return data;
  } catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem('elixpo_auth');
}

export function isSignedIn() {
  return !!getAuth()?.access_token;
}

export function getUser() {
  return getAuth()?.user || null;
}

// Try to refresh if access token is expired (15 min), but session is still valid
export async function ensureAuth() {
  const auth = getAuth();
  if (!auth) return null;
  const tokenAge = Date.now() - (auth.savedAt || 0);
  // Access token expires in 15 min, try refresh
  if (tokenAge > 14 * 60 * 1000 && auth.refresh_token) {
    try {
      const newTokens = await refreshToken(auth.refresh_token);
      const user = await fetchUser(newTokens.access_token);
      saveAuth(newTokens, user);
      return { ...newTokens, user };
    } catch {
      return auth; // fallback to existing
    }
  }
  return auth;
}

// Guest usage limits
const GUEST_LIMITS = { images: 20, videos: 3, videoMinutes: 3 };

export function getGuestUsage() {
  if (typeof window === 'undefined') return { images: 0, videos: 0 };
  try {
    const raw = localStorage.getItem('elixpo_guest_usage');
    return raw ? JSON.parse(raw) : { images: 0, videos: 0 };
  } catch { return { images: 0, videos: 0 }; }
}

export function incrementGuestUsage(type) {
  const usage = getGuestUsage();
  usage[type] = (usage[type] || 0) + 1;
  localStorage.setItem('elixpo_guest_usage', JSON.stringify(usage));
  return usage;
}

export function canGuestGenerate(type) {
  if (isSignedIn()) return true;
  const usage = getGuestUsage();
  if (type === 'video') return usage.videos < GUEST_LIMITS.videos;
  return usage.images < GUEST_LIMITS.images;
}

export function getGuestRemaining(type) {
  const usage = getGuestUsage();
  if (type === 'video') return Math.max(0, GUEST_LIMITS.videos - (usage.videos || 0));
  return Math.max(0, GUEST_LIMITS.images - (usage.images || 0));
}

export function getGuestSessionId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem('elixpo_guest_session');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('elixpo_guest_session', id);
  }
  return id;
}
