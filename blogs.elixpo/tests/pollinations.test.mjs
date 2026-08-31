import assert from 'node:assert/strict';
import test from 'node:test';
import {
  POLLINATIONS_MODELS,
  authorizationUrl,
  pkceChallenge,
  publicConnection,
  randomVerifier,
  tokenFingerprint,
} from '../lib/pollinations.js';

test('Pollinations authorization uses code PKCE and only usage scope', async () => {
  const previous = process.env.POLLINATIONS_APP_KEY;
  process.env.POLLINATIONS_APP_KEY = 'pk_test_public';
  try {
    const verifier = randomVerifier();
    const challenge = await pkceChallenge(verifier);
    const url = new URL(authorizationUrl({ origin: 'https://blogs.elixpo.com', state: 'csrf', challenge }));
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('scope'), 'usage');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('code_challenge'), challenge);
    assert.equal(url.searchParams.get('models'), POLLINATIONS_MODELS.join(','));
    assert.equal(url.searchParams.has('keys'), false);
  } finally {
    if (previous === undefined) delete process.env.POLLINATIONS_APP_KEY;
    else process.env.POLLINATIONS_APP_KEY = previous;
  }
});

test('Pollinations limits image access to the supported default models', () => {
  assert.deepEqual(POLLINATIONS_MODELS, ['gptimage', 'flux', 'klein']);
});

test('token fingerprints are stable and do not expose the token', async () => {
  const token = 'sk_super-secret-value';
  const first = await tokenFingerprint(token);
  assert.equal(first, await tokenFingerprint(token));
  assert.equal(first.includes(token), false);
});

test('public connection shape never returns encrypted credential material', () => {
  const result = publicConnection({
    access_token_encrypted: 'v1.secret', status: 'connected', permitted_models: '["flux","kontext"]',
    usage_summary: '{"requests":2}', granted_scope: 'usage', expires_at: 9999999999,
  });
  assert.equal(result.connected, true);
  assert.deepEqual(result.models, ['flux']);
  assert.equal('access_token_encrypted' in result, false);
});
