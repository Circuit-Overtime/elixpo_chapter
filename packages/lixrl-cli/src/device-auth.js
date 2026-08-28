const DEVICE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const DEFAULT_ACCOUNTS_URL = 'https://accounts.elixpo.com';
const DEFAULT_CLIENT_ID = 'lixrl-cli-prod';
const DEFAULT_AUDIENCE = 'lixrl.com';
const DEFAULT_TIMEOUT_MS = 15_000;

const SAFE_ERRORS = {
  access_denied: 'Login was denied.',
  expired_token: 'The device authorization expired. Run lixrl login again.',
  invalid_client: 'The Lixrl CLI is not registered with Elixpo Accounts.',
  invalid_scope: 'The requested Accounts permissions are not available.',
  slow_down: 'Accounts requested slower polling.',
  temporarily_unavailable: 'Elixpo Accounts is temporarily unavailable.',
};

export class DeviceAuthError extends Error {
  constructor(code = 'authentication_failed', status = 0) {
    super(SAFE_ERRORS[code] || 'Device authorization failed.');
    this.name = 'DeviceAuthError';
    this.code = code;
    this.status = status;
  }
}

function trustedBase(value) {
  const url = new URL(value || DEFAULT_ACCOUNTS_URL);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !local) throw new DeviceAuthError('unsafe_accounts_origin');
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function json(response) {
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object') throw new DeviceAuthError('temporarily_unavailable', response.status);
  return payload;
}

export class AccountsDeviceAuth {
  constructor({
    accountsUrl = DEFAULT_ACCOUNTS_URL,
    clientId = DEFAULT_CLIENT_ID,
    audience = DEFAULT_AUDIENCE,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
    this.accountsUrl = trustedBase(accountsUrl);
    this.clientId = clientId;
    this.audience = audience;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.metadata = null;
  }

  async fetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        ...options,
        signal: options.signal || controller.signal,
        headers: { accept: 'application/json', ...options.headers },
      });
    } catch {
      throw new DeviceAuthError('temporarily_unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }

  async discover() {
    if (this.metadata) return this.metadata;
    const response = await this.fetch(`${this.accountsUrl}/.well-known/oauth-authorization-server`);
    const payload = await json(response);
    if (!response.ok || payload.issuer !== this.accountsUrl) {
      throw new DeviceAuthError('temporarily_unavailable', response.status);
    }
    if (!payload.grant_types_supported?.includes(DEVICE_GRANT)) {
      throw new DeviceAuthError('unsupported_device_flow');
    }
    for (const field of ['device_authorization_endpoint', 'token_endpoint', 'revocation_endpoint']) {
      if (typeof payload[field] !== 'string' || new URL(payload[field]).origin !== new URL(this.accountsUrl).origin) {
        throw new DeviceAuthError('untrusted_accounts_endpoint');
      }
    }
    this.metadata = payload;
    return payload;
  }

  async requestDeviceCode(scopes = ['openid', 'profile', 'email', 'lixrl:keys:create']) {
    const metadata = await this.discover();
    const unsupported = scopes.filter((scope) => !metadata.scopes_supported?.includes(scope));
    if (unsupported.length) throw new DeviceAuthError('invalid_scope');
    const response = await this.fetch(metadata.device_authorization_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        audience: this.audience,
        scope: scopes.join(' '),
      }),
    });
    const payload = await json(response);
    if (!response.ok) throw new DeviceAuthError(payload.error, response.status);
    if (!payload.device_code || !payload.user_code || !payload.verification_uri) {
      throw new DeviceAuthError('temporarily_unavailable', response.status);
    }
    return {
      deviceCode: payload.device_code,
      userCode: payload.user_code,
      verificationUri: payload.verification_uri,
      verificationUriComplete: payload.verification_uri_complete || payload.verification_uri,
      expiresInSeconds: Number(payload.expires_in) || 600,
      intervalSeconds: Number(payload.interval) || 5,
    };
  }

  async poll(deviceCode) {
    const metadata = await this.discover();
    const response = await this.fetch(metadata.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: DEVICE_GRANT,
        device_code: deviceCode,
        client_id: this.clientId,
      }),
    });
    const payload = await json(response);
    if (response.ok) {
      if (!payload.access_token || !payload.refresh_token) throw new DeviceAuthError('temporarily_unavailable');
      return { status: 'approved', accessToken: payload.access_token, refreshToken: payload.refresh_token };
    }
    if (payload.error === 'authorization_pending') return { status: 'pending' };
    if (payload.error === 'slow_down') return { status: 'slow_down' };
    throw new DeviceAuthError(payload.error, response.status);
  }

  async revoke(token) {
    if (!token) return;
    const metadata = await this.discover();
    await this.fetch(metadata.revocation_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, client_id: this.clientId }),
    }).catch(() => null);
  }
}

export async function waitForDeviceApproval(auth, challenge, { sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const deadline = Date.now() + challenge.expiresInSeconds * 1000;
  let intervalMs = challenge.intervalSeconds * 1000;
  while (Date.now() < deadline) {
    await sleep(intervalMs);
    const result = await auth.poll(challenge.deviceCode);
    if (result.status === 'approved') return result;
    if (result.status === 'slow_down') intervalMs += 5_000;
  }
  throw new DeviceAuthError('expired_token');
}

function lixrlTarget(apiUrl, pathname) {
  const origin = new URL(apiUrl);
  const target = new URL(pathname, origin);
  if (target.origin !== origin.origin) throw new DeviceAuthError('unsafe_api_target');
  return target;
}

export async function startLixrlAuthorization({ apiUrl, accessToken, fetchImpl = globalThis.fetch }) {
  const target = lixrlTarget(apiUrl, '/api/cli/auth/requests');
  const response = await fetchImpl(target, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await json(response);
  if (!response.ok || !payload.request_id || !payload.poll_secret || !payload.approval_url) {
    const error = new DeviceAuthError(response.status === 403 ? 'key_limit_reached' : 'authorization_start_failed', response.status);
    error.message = payload.error || error.message;
    throw error;
  }
  return {
    requestId: payload.request_id,
    pollSecret: payload.poll_secret,
    approvalUrl: payload.approval_url,
    expiresInSeconds: Number(payload.expires_in) || 600,
    intervalSeconds: Number(payload.interval) || 3,
  };
}

export async function pollLixrlAuthorization({ apiUrl, requestId, pollSecret, fetchImpl = globalThis.fetch }) {
  const target = lixrlTarget(apiUrl, `/api/cli/auth/requests/${encodeURIComponent(requestId)}/token`);
  const response = await fetchImpl(target, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ poll_secret: pollSecret }),
  });
  const payload = await json(response);
  if (response.status === 202 && payload.status === 'pending') return { status: 'pending' };
  if (!response.ok || typeof payload.key !== 'string') {
    const error = new DeviceAuthError(response.status === 403 ? 'access_denied' : 'key_exchange_failed', response.status);
    error.message = payload.error || error.message;
    throw error;
  }
  return payload;
}

export async function waitForLixrlApproval(apiUrl, authorization, {
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const deadline = Date.now() + authorization.expiresInSeconds * 1000;
  while (Date.now() < deadline) {
    await sleep(authorization.intervalSeconds * 1000);
    const result = await pollLixrlAuthorization({
      apiUrl,
      requestId: authorization.requestId,
      pollSecret: authorization.pollSecret,
      fetchImpl,
    });
    if (result.status !== 'pending') return result;
  }
  throw new DeviceAuthError('expired_token');
}
