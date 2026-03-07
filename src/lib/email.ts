import { smtpSendMail } from './smtp-client';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    user: process.env.SMTP_FROM_EMAIL || 'noreply@elixpo.com',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Elixpo (noreply)',
  };
}

/**
 * Send email via nodemailer (works in Node.js / next dev).
 * Dynamically imported so webpack doesn't try to bundle Node.js
 * built-ins (crypto, path, fs) for the edge runtime build.
 */
async function sendViaNodemailer(options: EmailOptions): Promise<void> {
  const { host, port, user, pass, fromName } = getSmtpConfig();

  // Dynamic import — keeps nodemailer out of the edge bundle
  const nodemailer = (await import(/* webpackIgnore: true */ 'nodemailer')).default;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `${fromName} <${user}>`,
    replyTo: 'accounts@elixpo.com',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    headers: {
      'X-Mailer': 'Elixpo Accounts Platform',
      'X-Priority': '3',
    },
  });
}

/**
 * Send email via cloudflare:sockets SMTP client (works in Cloudflare Workers)
 */
async function sendViaCloudflare(options: EmailOptions): Promise<void> {
  const { host, port, user, pass, fromName } = getSmtpConfig();

  await smtpSendMail(
    { host, port, secure: port === 465, auth: { user, pass } },
    {
      from: `${fromName} <${user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        'X-Mailer': 'Elixpo Accounts Platform',
        'X-Priority': '3',
        'Reply-To': 'accounts@elixpo.com',
      },
    }
  );
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const pass = process.env.SMTP_PASS || '';
  if (!pass) {
    throw new Error('SMTP_PASS is not configured');
  }

  // Try Cloudflare SMTP first (production), fall back to nodemailer (local dev)
  try {
    await sendViaCloudflare(options);
    console.log(`[Email] Sent via Cloudflare SMTP to ${options.to}`);
  } catch {
    try {
      await sendViaNodemailer(options);
      console.log(`[Email] Sent via nodemailer to ${options.to}`);
    } catch (nmError) {
      console.error('[Email] Both SMTP methods failed:', nmError);
      throw nmError;
    }
  }
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://accounts.elixpo.com';
const YEAR = new Date().getFullYear();

const baseStyles = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
      -webkit-text-size-adjust: 100%;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f4f5;
      padding: 48px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 6px;
      border: 1px solid #e4e4e7;
      overflow: hidden;
    }
    .header {
      background-color: #09090b;
      padding: 32px 40px 28px;
      border-bottom: 3px solid #22c55e;
    }
    .header-logo {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.3px;
    }
    .header-logo span {
      color: #22c55e;
    }
    .body {
      padding: 40px 40px 32px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #09090b;
      margin-bottom: 16px;
      line-height: 1.3;
    }
    p {
      font-size: 15px;
      line-height: 1.65;
      color: #3f3f46;
      margin-bottom: 20px;
    }
    .code-block {
      background-color: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 28px 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-value {
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 36px;
      font-weight: 700;
      color: #09090b;
      letter-spacing: 10px;
    }
    .code-caption {
      font-size: 13px;
      color: #71717a;
      margin-top: 10px;
      margin-bottom: 0;
    }
    .btn-container {
      margin: 28px 0;
    }
    .btn {
      display: inline-block;
      background-color: #22c55e;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 5px;
      letter-spacing: 0.1px;
    }
    .link-fallback {
      background-color: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 5px;
      padding: 12px 16px;
      margin: 16px 0 28px;
      word-break: break-all;
    }
    .link-fallback a {
      font-size: 13px;
      color: #22c55e;
      text-decoration: none;
    }
    .notice {
      background-color: #fefce8;
      border-left: 3px solid #eab308;
      border-radius: 3px;
      padding: 14px 16px;
      margin: 24px 0;
    }
    .notice p {
      font-size: 13px;
      color: #713f12;
      margin-bottom: 0;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .info-table td {
      padding: 10px 14px;
      font-size: 14px;
      border-bottom: 1px solid #f4f4f5;
    }
    .info-table td:first-child {
      color: #71717a;
      font-weight: 600;
      width: 120px;
      white-space: nowrap;
    }
    .info-table td:last-child {
      color: #18181b;
      word-break: break-all;
    }
    .divider {
      border: none;
      border-top: 1px solid #e4e4e7;
      margin: 28px 0;
    }
    .footer {
      background-color: #fafafa;
      border-top: 1px solid #e4e4e7;
      padding: 24px 40px;
    }
    .footer p {
      font-size: 12px;
      color: #a1a1aa;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .footer a {
      color: #71717a;
      text-decoration: none;
    }
    .footer a:hover { text-decoration: underline; }
  </style>
`;

function buildEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${baseStyles}
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-logo">ELIXPO <span>ACCOUNTS</span></div>
      </div>
      <div class="body">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>This email was sent by <strong>elixpoo@gmail.com</strong>, a registered worker of <a href="mailto:accounts@elixpo.com" style="color:#22c55e;">accounts@elixpo.com</a>. Please reply to <a href="mailto:accounts@elixpo.com" style="color:#22c55e;">accounts@elixpo.com</a> for any queries.</p>
        <p>
          <a href="${APP_URL}">accounts.elixpo.com</a>
          &nbsp;&middot;&nbsp;
          <a href="${APP_URL}/privacy">Privacy Policy</a>
          &nbsp;&middot;&nbsp;
          <a href="${APP_URL}/terms">Terms of Service</a>
        </p>
        <p style="margin-top:12px;">&copy; ${YEAR} Elixpo. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

export const emailTemplates = {

  // Verification OTP
  otp: (recipientName: string, otpCode: string, expiryMinutes: number = 10) => {
    const firstName = recipientName.split(' ')[0];
    const subject = `Your Elixpo verification code: ${otpCode}`;
    const html = buildEmail('Email Verification', `
      <h1 class="title">Verify your email address</h1>
      <p>Hello, ${firstName}</p>
      <p>Use the verification code below to confirm your Elixpo account. This code is valid for <strong>${expiryMinutes} minutes</strong> and can only be used once.</p>

      <div class="code-block">
        <div class="otp-value">${otpCode}</div>
        <p class="code-caption">One-time verification code &mdash; expires in ${expiryMinutes} minutes</p>
      </div>

      <div class="notice">
        <p><strong>Security notice:</strong> Do not share this code with anyone. Elixpo staff will never ask for your verification code by phone, email, or chat.</p>
      </div>

      <p>If you did not request this code, you can safely ignore this message. Your account remains secure.</p>
    `);
    const text = `Your Elixpo verification code is: ${otpCode}\n\nThis code expires in ${expiryMinutes} minutes.\n\nDo not share this code with anyone.`;
    return { subject, html, text };
  },

  // Password Reset
  passwordReset: (recipientName: string, resetLink: string, expiryHours: number = 24) => {
    const firstName = recipientName.split(' ')[0];
    const subject = 'Reset your Elixpo password';
    const html = buildEmail('Password Reset', `
      <h1 class="title">Password reset request</h1>
      <p>Hello, ${firstName}</p>
      <p>We received a request to reset the password associated with this email address. If this was you, click the button below to choose a new password.</p>

      <div class="btn-container">
        <a href="${resetLink}" class="btn">Reset Password</a>
      </div>

      <p>If the button above does not work, copy and paste the following link into your browser:</p>
      <div class="link-fallback">
        <a href="${resetLink}">${resetLink}</a>
      </div>

      <div class="notice">
        <p>This link will expire in <strong>${expiryHours} hours</strong>. After that you will need to submit a new request.</p>
      </div>

      <hr class="divider">
      <p>If you did not request a password reset, please disregard this email. Your password has not been changed, and your account remains secure. If you believe your account may be at risk, contact us at <a href="mailto:accounts@elixpo.com" style="color:#22c55e;">accounts@elixpo.com</a>.</p>
    `);
    const text = `Reset your Elixpo password:\n${resetLink}\n\nThis link expires in ${expiryHours} hours.\n\nIf you did not request this, ignore this email.`;
    return { subject, html, text };
  },

  // Welcome / Email Verification after signup
  signupConfirmation: (recipientName: string, verificationLink: string) => {
    const firstName = recipientName.split(' ')[0];
    const subject = 'Welcome to Elixpo — please verify your email';
    const html = buildEmail('Welcome to Elixpo', `
      <h1 class="title">Welcome to Elixpo</h1>
      <p>Hello, ${firstName}</p>
      <p>Thank you for creating an Elixpo account. To activate your account and access all features, please verify your email address by clicking the button below.</p>

      <div class="btn-container">
        <a href="${verificationLink}" class="btn">Verify Email Address</a>
      </div>

      <p>If the button does not work, copy and paste this link into your browser:</p>
      <div class="link-fallback">
        <a href="${verificationLink}">${verificationLink}</a>
      </div>

      <hr class="divider">
      <p>If you did not create this account, please ignore this email or contact us at <a href="mailto:accounts@elixpo.com" style="color:#22c55e;">accounts@elixpo.com</a> if you have concerns.</p>
    `);
    const text = `Welcome to Elixpo, ${firstName}.\n\nVerify your email:\n${verificationLink}`;
    return { subject, html, text };
  },

  // New sign-in notification
  signinConfirmation: (
    recipientName: string,
    ipAddress: string,
    userAgent: string,
    timestamp: string
  ) => {
    const firstName = recipientName.split(' ')[0];
    const subject = 'New sign-in to your Elixpo account';
    const html = buildEmail('Sign-in Notification', `
      <h1 class="title">New sign-in detected</h1>
      <p>Hello, ${firstName}</p>
      <p>A new sign-in to your Elixpo account was recorded. Review the details below.</p>

      <table class="info-table">
        <tr>
          <td>Time</td>
          <td>${timestamp}</td>
        </tr>
        <tr>
          <td>IP Address</td>
          <td>${ipAddress}</td>
        </tr>
        <tr>
          <td>Device</td>
          <td>${userAgent || 'Unknown'}</td>
        </tr>
      </table>

      <div class="notice">
        <p>If this was not you, change your password immediately and contact us at <a href="mailto:accounts@elixpo.com" style="color:#713f12;">accounts@elixpo.com</a>.</p>
      </div>

      <p>If you initiated this sign-in, no action is required.</p>
    `);
    const text = `New sign-in to your Elixpo account.\n\nTime: ${timestamp}\nIP: ${ipAddress}\nDevice: ${userAgent}\n\nIf this was not you, secure your account immediately.`;
    return { subject, html, text };
  },

  // API Key created notification
  apiKeyCreated: (recipientName: string, keyName: string, keyPrefix: string, scopes: string[]) => {
    const firstName = recipientName.split(' ')[0];
    const subject = `New API key created: ${keyName}`;
    const html = buildEmail('API Key Created', `
      <h1 class="title">New API key created</h1>
      <p>Hello, ${firstName}</p>
      <p>A new API key has been created for your Elixpo account. Please review the details below.</p>

      <table class="info-table">
        <tr>
          <td>Key Name</td>
          <td>${keyName}</td>
        </tr>
        <tr>
          <td>Key Prefix</td>
          <td><code>${keyPrefix}...</code></td>
        </tr>
        <tr>
          <td>Scopes</td>
          <td>${scopes.join(', ')}</td>
        </tr>
        <tr>
          <td>Created</td>
          <td>${new Date().toUTCString()}</td>
        </tr>
      </table>

      <div class="notice">
        <p>If you did not create this API key, revoke it immediately from your account dashboard and contact us at <a href="mailto:accounts@elixpo.com" style="color:#713f12;">accounts@elixpo.com</a>.</p>
      </div>
    `);
    const text = `New API key "${keyName}" (${keyPrefix}...) created on your Elixpo account.\n\nScopes: ${scopes.join(', ')}\n\nIf you did not create this, contact accounts@elixpo.com immediately.`;
    return { subject, html, text };
  },

  // OAuth App registered
  appRegistered: (recipientName: string, appName: string, clientId: string) => {
    const firstName = recipientName.split(' ')[0];
    const subject = `OAuth app registered: ${appName}`;
    const html = buildEmail('App Registered', `
      <h1 class="title">OAuth application registered</h1>
      <p>Hello, ${firstName}</p>
      <p>Your new OAuth application has been successfully registered on Elixpo Accounts.</p>

      <table class="info-table">
        <tr>
          <td>App Name</td>
          <td>${appName}</td>
        </tr>
        <tr>
          <td>Client ID</td>
          <td><code>${clientId}</code></td>
        </tr>
        <tr>
          <td>Created</td>
          <td>${new Date().toUTCString()}</td>
        </tr>
      </table>

      <p>You can manage your application from the <a href="${APP_URL}/dashboard/oauth-apps" style="color:#22c55e;">Developer Portal</a>.</p>

      <div class="notice">
        <p><strong>Reminder:</strong> Store your client secret securely. It cannot be retrieved after creation. If lost, you can regenerate it from the dashboard.</p>
      </div>
    `);
    const text = `OAuth app "${appName}" (${clientId}) registered successfully.\n\nManage it at ${APP_URL}/dashboard/oauth-apps`;
    return { subject, html, text };
  },

  // OAuth App deleted / deactivated
  appDeleted: (recipientName: string, appName: string, clientId: string) => {
    const firstName = recipientName.split(' ')[0];
    const subject = `OAuth app deactivated: ${appName}`;
    const html = buildEmail('App Deactivated', `
      <h1 class="title">OAuth application deactivated</h1>
      <p>Hello, ${firstName}</p>
      <p>Your OAuth application has been deactivated and will no longer accept authentication requests.</p>

      <table class="info-table">
        <tr>
          <td>App Name</td>
          <td>${appName}</td>
        </tr>
        <tr>
          <td>Client ID</td>
          <td><code>${clientId}</code></td>
        </tr>
        <tr>
          <td>Deactivated</td>
          <td>${new Date().toUTCString()}</td>
        </tr>
      </table>

      <div class="notice">
        <p>If you did not deactivate this application, secure your account immediately and contact us at <a href="mailto:accounts@elixpo.com" style="color:#713f12;">accounts@elixpo.com</a>.</p>
      </div>
    `);
    const text = `OAuth app "${appName}" (${clientId}) has been deactivated.\n\nIf this was not you, contact accounts@elixpo.com immediately.`;
    return { subject, html, text };
  },

  // Admin: account suspended
  accountSuspended: (recipientName: string, reason?: string) => {
    const firstName = recipientName.split(' ')[0];
    const subject = 'Your Elixpo account has been suspended';
    const html = buildEmail('Account Suspended', `
      <h1 class="title">Account suspended</h1>
      <p>Hello, ${firstName}</p>
      <p>Your Elixpo account has been suspended. You will not be able to sign in or use Elixpo services until the suspension is lifted.</p>

      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}

      <p>If you believe this is a mistake or would like to appeal, please contact our support team at <a href="mailto:accounts@elixpo.com" style="color:#22c55e;">accounts@elixpo.com</a> with your account email address.</p>
    `);
    const text = `Your Elixpo account has been suspended.\n${reason ? `Reason: ${reason}\n` : ''}\nContact accounts@elixpo.com to appeal.`;
    return { subject, html, text };
  },
};

// ---------------------------------------------------------------------------
// Helper send functions
// ---------------------------------------------------------------------------

export async function sendOTPEmail(
  email: string,
  recipientName: string,
  otpCode: string
): Promise<void> {
  const t = emailTemplates.otp(
    recipientName,
    otpCode,
    parseInt(process.env.EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES || '10')
  );
  await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
}

export async function sendPasswordResetEmail(
  email: string,
  recipientName: string,
  resetLink: string
): Promise<void> {
  const t = emailTemplates.passwordReset(
    recipientName,
    resetLink,
    parseInt(process.env.EMAIL_VERIFICATION_LINK_EXPIRY_HOURS || '24')
  );
  await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
}

export async function sendSignupConfirmationEmail(
  email: string,
  recipientName: string,
  verificationLink: string
): Promise<void> {
  const t = emailTemplates.signupConfirmation(recipientName, verificationLink);
  await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
}

export async function sendSigninConfirmationEmail(
  email: string,
  recipientName: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const timestamp = new Date().toUTCString();
  const t = emailTemplates.signinConfirmation(recipientName, ipAddress, userAgent, timestamp);
  await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
}

export async function sendApiKeyCreatedEmail(
  email: string,
  recipientName: string,
  keyName: string,
  keyPrefix: string,
  scopes: string[]
): Promise<void> {
  const t = emailTemplates.apiKeyCreated(recipientName, keyName, keyPrefix, scopes);
  await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
}

export async function sendAppRegisteredEmail(
  email: string,
  recipientName: string,
  appName: string,
  clientId: string
): Promise<void> {
  const t = emailTemplates.appRegistered(recipientName, appName, clientId);
  await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
}

export async function sendAppDeletedEmail(
  email: string,
  recipientName: string,
  appName: string,
  clientId: string
): Promise<void> {
  const t = emailTemplates.appDeleted(recipientName, appName, clientId);
  await sendEmail({ to: email, subject: t.subject, html: t.html, text: t.text });
}
