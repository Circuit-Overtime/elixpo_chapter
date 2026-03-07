export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import {
  sendEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendSignupConfirmationEmail,
  sendSigninConfirmationEmail,
  sendApiKeyCreatedEmail,
  emailTemplates,
} from '../../../../src/lib/email';

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;
  const auth = request.headers.get('Authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, to, data } = await request.json();

  try {
    switch (type) {
      case 'otp':
        await sendOTPEmail(to, data.recipientName ?? '', data.otpCode);
        break;
      case 'password_reset':
        await sendPasswordResetEmail(to, data.recipientName ?? '', data.resetUrl);
        break;
      case 'signup_confirmation':
        await sendSignupConfirmationEmail(to, data.recipientName ?? '', data.verificationUrl);
        break;
      case 'signin_notification':
        await sendSigninConfirmationEmail(to, data.recipientName ?? '', data.ipAddress, data.userAgent);
        break;
      case 'api_key_created':
        await sendApiKeyCreatedEmail(
          to,
          data.recipientName ?? '',
          data.keyName,
          data.keyPrefix,
          Array.isArray(data.scopes) ? data.scopes : []
        );
        break;
      case 'account_suspended': {
        const t = emailTemplates.accountSuspended(data.recipientName ?? '', data.reason);
        await sendEmail({ to, subject: t.subject, html: t.html, text: t.text });
        break;
      }
      case 'admin_notification':
        await sendAdminNotificationEmail(
          to,
          data.subject,
          data.message,
          data.resourceType,
          data.resourceName
        );
        break;
      default:
        return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[send-email]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendAdminNotificationEmail(
  to: string,
  subject: string,
  message: string,
  resourceType: string,
  resourceName: string
) {
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: parseInt(process.env.SMTP_PORT || '465') === 465,
    auth: {
      user: process.env.SMTP_FROM_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 8px;">
      <div style="margin-bottom: 24px;">
        <span style="background: #22c55e; color: #000; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Admin Alert</span>
      </div>
      <h2 style="color: #f1f5f9; margin-bottom: 8px;">${subject}</h2>
      <p style="color: #94a3b8; line-height: 1.6;">${message}</p>
      ${resourceType ? `<div style="background: #1e293b; padding: 16px; border-radius: 6px; margin-top: 16px;">
        <span style="color: #64748b; font-size: 12px;">${resourceType}</span>
        <p style="color: #f1f5f9; margin: 4px 0; font-weight: 600;">${resourceName}</p>
      </div>` : ''}
      <hr style="border-color: #1e293b; margin: 24px 0;" />
      <p style="color: #475569; font-size: 12px;">Elixpo Accounts — Admin Notifications</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'Elixpo Accounts'}" <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject: `[Elixpo Admin] ${subject}`,
    html,
  });
}
