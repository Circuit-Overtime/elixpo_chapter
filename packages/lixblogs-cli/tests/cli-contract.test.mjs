import test from 'node:test';
import assert from 'node:assert/strict';
import { EXIT_CODES, errorEnvelope, normalizeCommand, requireConfirmation } from '../src/cli/contract.js';

test('top-level authentication commands preserve auth aliases', () => {
  assert.deepEqual(normalizeCommand(['login']), ['auth', 'login']);
  assert.deepEqual(normalizeCommand(['whoami']), ['auth', 'whoami']);
  assert.deepEqual(normalizeCommand(['use', 'work']), ['auth', 'use', 'work']);
  assert.deepEqual(normalizeCommand(['blog', 'list']), ['blog', 'list']);
});

test('machine errors have a stable redaction-friendly shape', () => {
  assert.deepEqual(errorEnvelope({ code: 'invalid_input', message: 'Bad input', hint: 'Fix it', requestId: 'r1' }), {
    ok: false,
    error: { code: 'invalid_input', message: 'Bad input', hint: 'Fix it', requestId: 'r1' },
  });
});

test('state transitions fail closed without explicit approval', () => {
  assert.throws(
    () => requireConfirmation({}, 'Publishing this blog'),
    (error) => error.code === 'confirmation_required' && error.exitCode === EXIT_CODES.CONFIRMATION,
  );
  assert.doesNotThrow(() => requireConfirmation({ yes: true }, 'Publishing this blog'));
});
