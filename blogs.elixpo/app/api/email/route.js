export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { orgInvite } from '../../../email/templates/org-invite';
import { blogInvite } from '../../../email/templates/blog-invite';
import { welcome } from '../../../email/templates/welcome';
import { notification } from '../../../email/templates/notification';

const TEMPLATES = { orgInvite, blogInvite, welcome, notification };

/**
 * POST /api/email
 * Internal-only endpoint for sending templated emails.
 *
 * Body: { template: string, data: object, to: string }
 *
 * Only authenticated users can trigger emails.
 * In production, this calls MailChannels (free for CF Workers).
 */
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { template, data, to } = await request.json();

  if (!template || !data || !to) {
    return NextResponse.json({ error: 'Missing template, data, or to' }, { status: 400 });
  }

  const gen = TEMPLATES[template];
  if (!gen) {
    return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
  }

  const { subject, html } = gen(data);

  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@elixpo.com', name: 'LixBlogs' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (res.ok || res.status === 202) {
      return NextResponse.json({ ok: true });
    }

    const text = await res.text();
    console.error('MailChannels error:', res.status, text);
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
  } catch (e) {
    console.error('Email send error:', e);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
