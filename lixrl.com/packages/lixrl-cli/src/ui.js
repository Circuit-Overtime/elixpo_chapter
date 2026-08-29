import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

const ANSI = Object.freeze({
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  violet: '\u001b[38;5;141m',
  green: '\u001b[38;5;42m',
  red: '\u001b[38;5;203m',
  yellow: '\u001b[38;5;220m',
});

export function colorEnabled(stream = process.stderr, env = process.env) {
  return Boolean(stream.isTTY) && env.NO_COLOR === undefined && env.TERM !== 'dumb';
}

function paint(value, code, enabled) {
  return enabled ? `${code}${value}${ANSI.reset}` : value;
}

export function loginChallenge({ url, code, expiresInSeconds, profile, interactive, color = false }) {
  const instruction = interactive
    ? 'Press Enter to open here, or use the URL on another device.'
    : 'Open the URL in any browser and approve this device.';
  return [
    '',
    `  ${paint('◆', ANSI.violet, color)} ${paint('Lixrl', ANSI.bold, color)}`,
    `  ${paint('Device login', ANSI.dim, color)}`,
    '  ─────────────────────────────────────────',
    `  URL      ${url}`,
    `  Code     ${paint(code, ANSI.bold, color)}`,
    `  Expires  ${Math.ceil(expiresInSeconds / 60)} min`,
    `  Profile  ${profile} ${paint('(local credential slot)', ANSI.dim, color)}`,
    '',
    `  ${instruction}`,
    '  No localhost callback or exposed port is required.',
    '',
  ].join('\n');
}

export function approvalChallenge({ url, color = false }) {
  return [
    '',
    `  ${paint('✓', ANSI.green, color)} Identity approved`,
    `  ${paint('→', ANSI.violet, color)} Review key access  ${url}`,
    '',
  ].join('\n');
}

export function successLine(message, color = false) {
  return `  ${paint('✓', ANSI.green, color)} ${message}`;
}

export function failureBlock(error, color = false) {
  const lines = [`  ${paint('✘', ANSI.red, color)} ${paint(error.message, ANSI.bold, color)}`];
  if (error.code === 'api_key_limit_reached' || error.code === 'key_limit_reached') {
    const limit = Number(error.details?.limit);
    const tier = typeof error.details?.tier === 'string' ? error.details.tier : null;
    if (Number.isFinite(limit) && tier) {
      lines.push(`  ${paint('!', ANSI.yellow, color)} Your ${tier} plan allows ${limit} active API ${limit === 1 ? 'key' : 'keys'}.`);
    }
    const manageUrl = error.details?.manage_url || 'https://lixrl.com/profile/keys';
    lines.push(
      `  ${paint('→', ANSI.violet, color)} Revoke an unused key: ${manageUrl}`,
      `  ${paint('→', ANSI.violet, color)} Then retry: ${error.details?.retry_command || 'lixrl login --open'}`,
    );
  }
  if (error.requestId) lines.push(`  ${paint('Request', ANSI.dim, color)}  ${error.requestId}`);
  return lines.join('\n');
}

export function listenForEnter({ input = process.stdin, open, url }) {
  if (!input.isTTY || typeof open !== 'function') return () => {};
  const onData = () => { Promise.resolve(open(url)).catch(() => {}); };
  input.setEncoding?.('utf8');
  input.once('data', onData);
  input.resume?.();
  return () => {
    input.off?.('data', onData);
    input.pause?.();
  };
}

export function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

export async function promptConfirm(label, { input = process.stdin, output = process.stderr } = {}) {
  if (!input.isTTY || !output.isTTY) return false;
  const prompt = createInterface({ input, output });
  try {
    const answer = await prompt.question(`${label} [y/N] `);
    return /^y(?:es)?$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

export async function promptEnter(label, { input = process.stdin, output = process.stderr } = {}) {
  if (!input.isTTY || !output.isTTY) return false;
  const prompt = createInterface({ input, output });
  try {
    await prompt.question(`${label}\nPress Enter to retry.`);
    return true;
  } finally {
    prompt.close();
  }
}

export async function promptSecret(label = 'Lixrl API key: ') {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8').trim();
  }
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
    };
    const onData = (chunk) => {
      const text = chunk.toString('utf8');
      if (text === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        reject(Object.assign(new Error('Login cancelled.'), { code: 'cancelled' }));
      } else if (text === '\r' || text === '\n') {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
      } else if (text === '\u007f') {
        if (value) value = value.slice(0, -1);
      } else if (/^[\x20-\x7E]+$/.test(text)) {
        value += text;
      }
    };
    process.stdin.on('data', onData);
  });
}
