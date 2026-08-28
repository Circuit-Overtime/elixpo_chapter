import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AccountsDeviceAuth,
  pollLixrlAuthorization,
  startLixrlAuthorization,
} from '../src/device-auth.js';

const discovery = {
  issuer: 'https://accounts.elixpo.com',
  device_authorization_endpoint: 'https://accounts.elixpo.com/api/auth/device/authorize',
  token_endpoint: 'https://accounts.elixpo.com/api/auth/token',
  revocation_endpoint: 'https://accounts.elixpo.com/api/auth/revoke',
  scopes_supported: ['openid', 'profile', 'email', 'lixrl:keys:create'],
  grant_types_supported: ['urn:ietf:params:oauth:grant-type:device_code'],
};

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('device login requests the registered Lixrl audience and identity scopes', async () => {
  const calls = [];
  const queue = [
    response(discovery),
    response({
      device_code: 'device-secret',
      user_code: 'LIXR-L123',
      verification_uri: 'https://accounts.elixpo.com/device',
      verification_uri_complete: 'https://accounts.elixpo.com/device?user_code=LIXR-L123',
      expires_in: 600,
      interval: 5,
    }),
  ];
  const auth = new AccountsDeviceAuth({
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      return queue.shift();
    },
  });
  const challenge = await auth.requestDeviceCode();
  assert.equal(challenge.userCode, 'LIXR-L123');
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.client_id, 'lixrl-cli-prod');
  assert.equal(body.audience, 'lixrl.com');
  assert.equal(body.scope, 'openid profile email lixrl:keys:create');
});

test('device polling keeps pending responses separate from returned tokens', async () => {
  const queue = [
    response(discovery),
    response({ error: 'authorization_pending' }, 400),
    response({ access_token: 'access-secret', refresh_token: 'refresh-secret' }),
  ];
  const auth = new AccountsDeviceAuth({ fetchImpl: async () => queue.shift() });
  assert.deepEqual(await auth.poll('device-secret'), { status: 'pending' });
  assert.deepEqual(await auth.poll('device-secret'), {
    status: 'approved',
    accessToken: 'access-secret',
    refreshToken: 'refresh-secret',
  });
});

test('Lixrl authorization start sends the short-lived Accounts token only once', async () => {
  const calls = [];
  const result = await startLixrlAuthorization({
    apiUrl: 'https://lixrl.com',
    accessToken: 'accounts-access-token',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return response({
        request_id: 'request-id',
        poll_secret: 'poll-secret',
        approval_url: 'https://lixrl.com/cli/authorize?request=request-id',
        expires_in: 600,
        interval: 3,
      }, 201);
    },
  });
  assert.equal(result.requestId, 'request-id');
  assert.equal(calls[0].url, 'https://lixrl.com/api/cli/auth/requests');
  assert.equal(calls[0].options.headers.authorization, 'Bearer accounts-access-token');
  assert.equal(calls[0].options.body, undefined);
});

test('Lixrl polling exchanges the secret for the approved API key', async () => {
  const calls = [];
  const result = await pollLixrlAuthorization({
    apiUrl: 'https://lixrl.com',
    requestId: 'request-id',
    pollSecret: 'poll-secret',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return response({ status: 'approved', key: `elu_${'a'.repeat(32)}` });
    },
  });
  assert.match(result.key, /^elu_/);
  assert.equal(calls[0].url, 'https://lixrl.com/api/cli/auth/requests/request-id/token');
  assert.deepEqual(JSON.parse(calls[0].options.body), { poll_secret: 'poll-secret' });
});
