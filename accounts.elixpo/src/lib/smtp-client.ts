/**
 * Minimal edge-compatible SMTP client using Cloudflare Workers TCP sockets.
 * Replaces nodemailer — no Node.js built-in dependencies (net, stream, fs, etc.).
 * Supports implicit TLS (port 465) and STARTTLS (port 587).
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

class SmtpConnection {
  private reader!: ReadableStreamDefaultReader<Uint8Array>;
  private writer!: WritableStreamDefaultWriter<Uint8Array>;
  private socket!: { readable: ReadableStream; writable: WritableStream; close: () => void };
  private buffer = '';
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();

  async connect(config: SmtpConfig): Promise<void> {
    // @ts-ignore — cloudflare:sockets is a Cloudflare Workers built-in module
    const { connect } = await import(/* webpackIgnore: true */ 'cloudflare:sockets');

    this.socket = connect(
      { hostname: config.host, port: config.port },
      { secureTransport: config.secure ? 'on' : 'off' }
    );

    this.reader = this.socket.readable.getReader();
    this.writer = this.socket.writable.getWriter();

    // Read server greeting
    const greeting = await this.readResponse();
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.text}`);
    }

    // EHLO
    const ehlo = await this.command(`EHLO elixpo.com`);
    if (ehlo.code !== 250) {
      throw new Error(`SMTP EHLO failed: ${ehlo.text}`);
    }

    // STARTTLS for port 587
    if (!config.secure) {
      const starttls = await this.command('STARTTLS');
      if (starttls.code !== 220) {
        throw new Error(`SMTP STARTTLS failed: ${starttls.text}`);
      }
      // Upgrade connection to TLS
      // @ts-ignore
      this.socket = this.socket.startTls();
      this.reader = this.socket.readable.getReader();
      this.writer = this.socket.writable.getWriter();
      this.buffer = '';

      // Re-EHLO after TLS upgrade
      const ehlo2 = await this.command('EHLO elixpo.com');
      if (ehlo2.code !== 250) {
        throw new Error(`SMTP EHLO after STARTTLS failed: ${ehlo2.text}`);
      }
    }

    // AUTH LOGIN
    const authStart = await this.command('AUTH LOGIN');
    if (authStart.code !== 334) {
      throw new Error(`SMTP AUTH LOGIN failed: ${authStart.text}`);
    }

    const userResp = await this.command(btoa(config.auth.user));
    if (userResp.code !== 334) {
      throw new Error(`SMTP AUTH user failed: ${userResp.text}`);
    }

    const passResp = await this.command(btoa(config.auth.pass));
    if (passResp.code !== 235) {
      throw new Error(`SMTP AUTH failed: ${passResp.text}`);
    }
  }

  async send(mail: MailMessage): Promise<void> {
    // Extract email address from "Name <email>" format
    const fromEmail = mail.from.includes('<')
      ? mail.from.match(/<(.+)>/)![1]
      : mail.from;

    const mailFrom = await this.command(`MAIL FROM:<${fromEmail}>`);
    if (mailFrom.code !== 250) {
      throw new Error(`SMTP MAIL FROM failed: ${mailFrom.text}`);
    }

    const rcptTo = await this.command(`RCPT TO:<${mail.to}>`);
    if (rcptTo.code !== 250) {
      throw new Error(`SMTP RCPT TO failed: ${rcptTo.text}`);
    }

    const dataCmd = await this.command('DATA');
    if (dataCmd.code !== 354) {
      throw new Error(`SMTP DATA failed: ${dataCmd.text}`);
    }

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

    lines.push(''); // blank line between headers and body

    if (mail.text) {
      lines.push(
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        mail.text,
      );
    }

    lines.push(
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      mail.html,
      `--${boundary}--`,
    );

    // Send message body, escaping lines that start with a dot
    const body = lines
      .map(line => (line.startsWith('.') ? '.' + line : line))
      .join('\r\n');

    // Send body followed by <CRLF>.<CRLF> to end DATA
    const result = await this.command(body + '\r\n.');
    if (result.code !== 250) {
      throw new Error(`SMTP message send failed: ${result.text}`);
    }
  }

  async close(): Promise<void> {
    try {
      await this.command('QUIT');
    } catch {
      // Ignore errors on QUIT
    }
    try {
      await this.writer.close();
    } catch {
      // Ignore
    }
    try {
      this.socket.close();
    } catch {
      // Ignore
    }
  }

  private async command(data: string): Promise<{ code: number; text: string }> {
    await this.writer.write(this.encoder.encode(data + '\r\n'));
    return this.readResponse();
  }

  private async readResponse(): Promise<{ code: number; text: string }> {
    while (true) {
      // Look for a complete SMTP response in the buffer.
      // Multi-line responses: "250-..." continuation, "250 ..." final line.
      const lines = this.buffer.split('\r\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Final response line: 3 digits followed by a space
        if (line.length >= 3 && /^\d{3} /.test(line)) {
          const consumed = lines.slice(0, i + 1).join('\r\n') + '\r\n';
          this.buffer = this.buffer.substring(consumed.length);
          const code = parseInt(line.substring(0, 3));
          return { code, text: lines.slice(0, i + 1).join('\n') };
        }
        // Also match a bare 3-digit code at end (e.g. "250\r\n" with no text)
        if (line.length === 3 && /^\d{3}$/.test(line) && i < lines.length - 1) {
          const consumed = lines.slice(0, i + 1).join('\r\n') + '\r\n';
          this.buffer = this.buffer.substring(consumed.length);
          const code = parseInt(line);
          return { code, text: line };
        }
      }

      // Need more data from socket
      const { value, done } = await this.reader.read();
      if (done) {
        throw new Error(`SMTP connection closed unexpectedly. Buffer: ${this.buffer}`);
      }
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }
}

function encodeSubject(subject: string): string {
  // If subject is pure ASCII, return as-is
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  // Otherwise, encode as UTF-8 base64 per RFC 2047
  return `=?UTF-8?B?${btoa(new TextEncoder().encode(subject).reduce((s, b) => s + String.fromCharCode(b), ''))}?=`;
}

/**
 * Send an email via SMTP. Edge-compatible — no Node.js dependencies.
 */
export async function smtpSendMail(config: SmtpConfig, mail: MailMessage): Promise<void> {
  const conn = new SmtpConnection();
  try {
    await conn.connect(config);
    await conn.send(mail);
  } finally {
    await conn.close();
  }
}
