const ACCOUNTS_BASE = 'https://accounts.elixpo.com';
const CLIENT_ID = process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID || '';
const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin}/auth/callback`
  : '';

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
      client_secret: process.env.NEXT_PUBLIC_ELIXPO_CLIENT_SECRET || '',
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

// Local storage helpers
export function saveAuth(tokens, user) {
  localStorage.setItem('elixpo_auth', JSON.stringify({ ...tokens, user, savedAt: Date.now() }));
}

export function getAuth() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('elixpo_auth');
    if (!raw) return null;
    return JSON.parse(raw);
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
