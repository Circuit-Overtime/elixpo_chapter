import { decryptIntegrationSecret, encryptIntegrationSecret } from './integrationSecrets';

export const POLLINATIONS_MODELS = Object.freeze(['flux', 'gptimage', 'kontext', 'nanobanana-2']);
export const POLLINATIONS_CALLBACK_PATH = '/api/integrations/pollinations/callback';
const ENCRYPTION_ENV = 'POLLINATIONS_CONNECTION_ENCRYPTION_KEY';
const PROVIDER = 'https://gen.pollinations.ai';

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function pollinationsEnabled() {
  return process.env.POLLINATIONS_IMAGE_CONNECTOR_ENABLED === 'true';
}

export function randomVerifier(length = 48) {
  return base64url(crypto.getRandomValues(new Uint8Array(length)));
}

export async function pkceChallenge(verifier) {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

export async function tokenFingerprint(token) {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
}

export function callbackUrl(origin) {
  return `${origin}${POLLINATIONS_CALLBACK_PATH}`;
}

export function authorizationUrl({ origin, state, challenge }) {
  const clientId = process.env.POLLINATIONS_APP_KEY;
  if (!clientId?.startsWith('pk_')) throw new Error('POLLINATIONS_APP_KEY is not configured');
  return `https://enter.pollinations.ai/authorize?${new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: callbackUrl(origin), scope: 'usage',
    models: POLLINATIONS_MODELS.join(','), expiry: '7', budget: '10', state,
    code_challenge: challenge, code_challenge_method: 'S256',
  })}`;
}

export async function exchangeCode({ code, verifier, origin }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, client_id: process.env.POLLINATIONS_APP_KEY || '',
    redirect_uri: callbackUrl(origin), code_verifier: verifier,
  });
  const response = await fetch('https://enter.pollinations.ai/api/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    signal: AbortSignal.timeout(10000), cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw providerError(response.status, payload.error || 'token_exchange_failed');
  return payload;
}

export function providerError(status, code = 'provider_error') {
  const error = new Error(code);
  error.providerStatus = status;
  error.code = status === 401 ? 'revoked' : status === 402 ? 'insufficient_pollen'
    : status === 403 ? 'permission_denied' : status === 429 ? 'rate_limited'
      : status >= 500 ? 'provider_unavailable' : code;
  return error;
}

async function providerGet(path, token) {
  const response = await fetch(`${PROVIDER}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(7000), cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw providerError(response.status);
  return payload;
}

export async function inspectPollinationsToken(token) {
  const [key, profile, balance, usage] = await Promise.all([
    providerGet('/account/key', token), providerGet('/account/profile', token),
    providerGet('/account/balance', token), providerGet('/account/usage/daily', token),
  ]);
  return { key, profile, balance, usage };
}

export async function savePollinationsConnection(db, userId, tokenResponse, inspection) {
  const now = Math.floor(Date.now() / 1000);
  const scope = String(tokenResponse.scope || '').split(/[ ,]+/).filter(Boolean);
  if (!scope.includes('usage')) throw providerError(403, 'usage_scope_required');
  const token = tokenResponse.access_token;
  const encrypted = await encryptIntegrationSecret(token, { keyEnv: ENCRYPTION_ENV });
  const fingerprint = await tokenFingerprint(token);
  const expiresAt = tokenResponse.expires_in ? now + Number(tokenResponse.expires_in) : null;
  const key = inspection.key || {};
  const profile = inspection.profile || {};
  const balanceValue = Number(inspection.balance?.balance ?? inspection.balance?.pollen ?? inspection.balance);
  await db.prepare(`
    INSERT INTO pollinations_connections
      (user_id, access_token_encrypted, token_fingerprint, granted_scope, permitted_models,
       approved_budget, expires_at, key_valid, key_type, key_permissions, account_handle,
       account_avatar, balance, usage_summary, cache_expires_at, status, last_checked_at,
       last_error_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'connected', ?, NULL, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token_encrypted=excluded.access_token_encrypted, token_fingerprint=excluded.token_fingerprint,
      granted_scope=excluded.granted_scope, permitted_models=excluded.permitted_models,
      approved_budget=excluded.approved_budget, expires_at=excluded.expires_at,
      key_valid=excluded.key_valid, key_type=excluded.key_type, key_permissions=excluded.key_permissions,
      account_handle=excluded.account_handle, account_avatar=excluded.account_avatar,
      balance=excluded.balance, usage_summary=excluded.usage_summary,
      cache_expires_at=excluded.cache_expires_at, status='connected',
      last_checked_at=excluded.last_checked_at, last_error_code=NULL, updated_at=excluded.updated_at
  `).bind(
    userId, encrypted, fingerprint, scope.join(' '), JSON.stringify(POLLINATIONS_MODELS),
    key.budget ?? null, expiresAt, key.valid === false ? 0 : 1, key.type || null,
    JSON.stringify(key.permissions || []), profile.githubUsername || profile.name || null,
    profile.image || null, Number.isFinite(balanceValue) ? balanceValue : null,
    JSON.stringify(inspection.usage || null), now + 45, now, now, now,
  ).run();
}

export async function decryptPollinationsToken(connection) {
  return decryptIntegrationSecret(connection.access_token_encrypted, { keyEnv: ENCRYPTION_ENV });
}

export function publicConnection(connection) {
  if (!connection) return { connected: false, status: 'disconnected' };
  const now = Math.floor(Date.now() / 1000);
  const expired = connection.expires_at && connection.expires_at <= now;
  const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
  return {
    connected: !expired && connection.status === 'connected', status: expired ? 'expired' : connection.status,
    handle: connection.account_handle || null, avatar: connection.account_avatar || null,
    balance: connection.balance ?? null, budget: connection.approved_budget ?? null,
    scope: String(connection.granted_scope || '').split(' ').filter(Boolean),
    models: parse(connection.permitted_models || '[]', []),
    usage: parse(connection.usage_summary || 'null', null), expiresAt: connection.expires_at || null,
    lastRefreshedAt: connection.last_checked_at || null, errorCode: connection.last_error_code || null,
  };
}
