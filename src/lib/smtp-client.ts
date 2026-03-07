/**
 * Minimal edge-compatible SMTP client.
 * Primary: Cloudflare Workers TCP sockets (cloudflare:sockets) — used in production.
 * Fallback: Node.js tls/net — used in local development (next dev).
 */

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean; // true = implicit TLS (465), false = STARTTLS (587)
  auth: { user: string; pass: string };
}

interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Abstract transport interface
// ---------------------------------------------------------------------------

interface SmtpTransport {
  read(): Promise<string>;
  write(data: string): Promise<void>;
  upgradeToTls(host: string): Promise<void>;
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Cloudflare Workers transport (cloudflare:sockets)
// ---------------------------------------------------------------------------

async function createCloudflareTransport(config: SmtpConfig): Promise<SmtpTransport> {
  // @ts-ignore — cloudflare:sockets is a Cloudflare Workers built-in
  const { connect } = await import(/* webpackIgnore: true */ 'cloudflare:sockets');

  let socket = connect(
    { hostname: config.host, port: config.port },
    { secureTransport: config.secure ? 'on' : 'off' } as any
  );
  let reader = socket.readable.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  let writer = socket.writable.getWriter() as WritableStreamDefaultWriter<Uint8Array>;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return {
    async read(): Promise<string> {
      while (true) {
        const lines = buffer.split('\r\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if ((line.length >= 3 && /^\d{3} /.test(line)) ||
              (line.length === 3 && /^\d{3}$/.test(line) && i < lines.length - 1)) {
            const consumed = lines.slice(0, i + 1).join('\r\n') + '\r\n';
            buffer = buffer.substring(consumed.length);
            return lines.slice(0, i + 1).join('\n');
          }
        }
        const { value, done } = await reader.read();
        if (done) throw new Error(`SMTP connection closed. Buffer: ${buffer}`);
        buffer += decoder.decode(value, { stream: true });
      }
    },
    async write(data: string): Promise<void> {
      await writer.write(encoder.encode(data + '\r\n'));
    },
    async upgradeToTls(): Promise<void> {
      // @ts-ignore
      socket = socket.startTls();
      reader = socket.readable.getReader();
      writer = socket.writable.getWriter();
      buffer = '';
    },
    async close(): Promise<void> {
      try { await writer.close(); } catch { /* ignore */ }
      try { socket.close(); } catch { /* ignore */ }
    },
  };
}

// ---------------------------------------------------------------------------
// Node.js transport (tls / net) — for local development
// ---------------------------------------------------------------------------

async function createNodeTransport(config: SmtpConfig): Promise<SmtpTransport> {
  // Edge runtime sandbox blocks eval('require') and dynamic import of Node builtins.
  // Use Function constructor to bypass static analysis and sandbox restrictions.
  let _require: any;
  try {
    _require = new Function('return typeof require !== "undefined" ? require : null')();
  } catch {
    // noop
  }
  if (!_require) {
    try {
      // Alternative: access require from the module system
      _require = (globalThis as any).__non_webpack_require__ ?? (globalThis as any).require;
    } catch {
      // noop
    }
  }

  if (!_require) throw new Error('Node.js require not available for SMTP fallback');

  const tls = _require('tls');
  const net = _require('net');

  let socket: any;
  let buffer = '';

  const waitForData = (): Promise<void> => new Promise((resolve) => {
    socket.once('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      resolve();
    });
  });

  if (config.secure) {
    // Implicit TLS (port 465)
    socket = await new Promise<any>((resolve, reject) => {
      const s = tls.connect(config.port, config.host, { rejectUnauthorized: true }, () => resolve(s));
      s.on('error', reject);
    });
  } else {
    // Plain connection first (port 587), will STARTTLS later
    socket = await new Promise<any>((resolve, reject) => {
      const s = net.connect(config.port, config.host, () => resolve(s));
      s.on('error', reject);
    });
  }

  return {
    async read(): Promise<string> {
      while (true) {
        const lines = buffer.split('\r\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if ((line.length >= 3 && /^\d{3} /.test(line)) ||
              (line.length === 3 && /^\d{3}$/.test(line) && i < lines.length - 1)) {
            const consumed = lines.slice(0, i + 1).join('\r\n') + '\r\n';
            buffer = buffer.substring(consumed.length);
            return lines.slice(0, i + 1).join('\n');
          }
        }
        await waitForData();
      }
    },
    async write(data: string): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        socket.write(data + '\r\n', (err: any) => err ? reject(err) : resolve());
      });
    },
    async upgradeToTls(host: string): Promise<void> {
      socket = await new Promise<any>((resolve, reject) => {
        const tlsSocket = tls.connect(
          { socket, host, rejectUnauthorized: true },
          () => resolve(tlsSocket)
        );
        tlsSocket.on('error', reject);
      });
      buffer = '';
    },
    async close(): Promise<void> {
      try { socket.destroy(); } catch { /* ignore */ }
    },
  };
}

// ---------------------------------------------------------------------------
// SMTP session logic (transport-agnostic)
// ---------------------------------------------------------------------------

function parseCode(response: string): number {
  return parseInt(response.substring(0, 3));
}

async function smtpCommand(transport: SmtpTransport, data: string): Promise<{ code: number; text: string }> {
  await transport.write(data);
  const text = await transport.read();
  return { code: parseCode(text), text };
}

async function runSmtpSession(transport: SmtpTransport, config: SmtpConfig, mail: MailMessage): Promise<void> {
  // Read greeting
  const greeting = await transport.read();
  if (parseCode(greeting) !== 220) throw new Error(`SMTP greeting failed: ${greeting}`);

  // EHLO
  let ehlo = await smtpCommand(transport, 'EHLO elixpo.com');
  if (ehlo.code !== 250) throw new Error(`SMTP EHLO failed: ${ehlo.text}`);

  // STARTTLS for port 587
  if (!config.secure) {
    const starttls = await smtpCommand(transport, 'STARTTLS');
    if (starttls.code !== 220) throw new Error(`SMTP STARTTLS failed: ${starttls.text}`);
    await transport.upgradeToTls(config.host);
    ehlo = await smtpCommand(transport, 'EHLO elixpo.com');
    if (ehlo.code !== 250) throw new Error(`SMTP EHLO after STARTTLS failed: ${ehlo.text}`);
  }

  // AUTH LOGIN
  const authStart = await smtpCommand(transport, 'AUTH LOGIN');
  if (authStart.code !== 334) throw new Error(`SMTP AUTH LOGIN failed: ${authStart.text}`);

  const userResp = await smtpCommand(transport, btoa(config.auth.user));
  if (userResp.code !== 334) throw new Error(`SMTP AUTH user failed: ${userResp.text}`);

  const passResp = await smtpCommand(transport, btoa(config.auth.pass));
  if (passResp.code !== 235) throw new Error(`SMTP AUTH failed: ${passResp.text}`);

  // MAIL FROM
  const fromEmail = mail.from.includes('<') ? mail.from.match(/<(.+)>/)![1] : mail.from;
  const mailFrom = await smtpCommand(transport, `MAIL FROM:<${fromEmail}>`);
  if (mailFrom.code !== 250) throw new Error(`SMTP MAIL FROM failed: ${mailFrom.text}`);

  // RCPT TO
  const rcptTo = await smtpCommand(transport, `RCPT TO:<${mail.to}>`);
  if (rcptTo.code !== 250) throw new Error(`SMTP RCPT TO failed: ${rcptTo.text}`);

  // DATA
  const dataCmd = await smtpCommand(transport, 'DATA');
  if (dataCmd.code !== 354) throw new Error(`SMTP DATA failed: ${dataCmd.text}`);

  // Build MIME message
  const boundary = crypto.randomUUID().replace(/-/g, '');
  const lines: string[] = [
    `From: ${mail.from}`,
    `To: ${mail.to}`,
    `Subject: ${encodeSubject(mail.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@elixpo.com>`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (mail.headers) {
    for (const [key, value] of Object.entries(mail.headers)) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('');

  if (mail.text) {
    lines.push(`--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', mail.text);
  }

  lines.push(`--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', mail.html, `--${boundary}--`);

  const body = lines.map(line => (line.startsWith('.') ? '.' + line : line)).join('\r\n');
  const result = await smtpCommand(transport, body + '\r\n.');
  if (result.code !== 250) throw new Error(`SMTP message send failed: ${result.text}`);

  // QUIT
  try { await smtpCommand(transport, 'QUIT'); } catch { /* ignore */ }
}

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${btoa(new TextEncoder().encode(subject).reduce((s, b) => s + String.fromCharCode(b), ''))}?=`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send an email via SMTP.
 * Tries Cloudflare Workers sockets first, falls back to Node.js net/tls for local dev.
 */
export async function smtpSendMail(config: SmtpConfig, mail: MailMessage): Promise<void> {
  let transport: SmtpTransport;

  try {
    transport = await createCloudflareTransport(config);
  } catch {
    // Cloudflare sockets not available — fall back to Node.js
    console.log('[SMTP] cloudflare:sockets unavailable, falling back to Node.js tls/net');
    transport = await createNodeTransport(config);
  }

  try {
    await runSmtpSession(transport, config, mail);
  } finally {
    await transport.close();
  }
}
