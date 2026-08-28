import { spawn } from 'node:child_process';

export function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
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
