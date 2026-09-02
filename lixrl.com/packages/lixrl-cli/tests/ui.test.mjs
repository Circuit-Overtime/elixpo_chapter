import assert from 'node:assert/strict';
import test from 'node:test';
import { colorEnabled, failureBlock, loginChallenge, statusLine } from '../src/ui.js';

test('device login displays the prefilled verification URL without requiring color', () => {
  const output = loginChallenge({
    url: 'https://accounts.elixpo.com/device?user_code=LIXR-L123',
    code: 'LIXR-L123',
    expiresInSeconds: 600,
    profile: 'default',
    interactive: true,
  });
  assert.match(output, /device\?user_code=LIXR-L123/);
  assert.match(output, /Press Enter to open here/);
  assert.match(output, /No localhost callback or exposed port is required/);
  assert.doesNotMatch(output, /\u001b\[/);
});

test('NO_COLOR disables terminal styling', () => {
  assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: '1', TERM: 'xterm' }), false);
  assert.equal(colorEnabled({ isTTY: true }, { TERM: 'xterm' }), true);
});

test('terminal statuses use distinct symbols and colors', () => {
  assert.match(statusLine('success', 'Created', true), /✓.*Created/);
  assert.match(statusLine('info', 'Loading', true), /→.*Loading/);
  assert.match(statusLine('warning', 'Check input', true), /!.*Check input/);
  assert.match(statusLine('error', 'Failed', true), /✘.*Failed/);
  assert.notEqual(statusLine('success', 'Created', true), statusLine('error', 'Created', true));
  assert.doesNotMatch(statusLine('success', 'Created', false), /\u001b\[/);
});

test('correctable input failures render as warnings', () => {
  const output = failureBlock({ code: 'invalid_usage', message: 'Missing --file.' }, true);
  assert.match(output, /!.*Missing --file/);
  assert.doesNotMatch(output, /✘/);
});

test('key-limit errors include a concrete recovery path', () => {
  const output = failureBlock({
    code: 'api_key_limit_reached',
    message: 'API key limit reached (1 for free tier)',
    details: {
      limit: 1,
      tier: 'free',
      manage_url: 'https://lixrl.com/profile/keys',
      retry_command: 'lixrl login --open',
    },
  });
  assert.match(output, /free plan allows 1 active API key/);
  assert.match(output, /profile\/keys/);
  assert.match(output, /lixrl login --open/);
  assert.doesNotMatch(output, /\u001b\[/);
});
