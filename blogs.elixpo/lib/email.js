/**
 * Server-side email helper for use in API routes.
 *
 * Usage:
 *   import { sendOrgInvite, sendBlogInvite, sendWelcome, sendNotification } from '../../../lib/email';
 *   await sendOrgInvite('user@example.com', { orgName: '...', ... });
 */

import { orgInvite } from '../email/templates/org-invite';
import { blogInvite } from '../email/templates/blog-invite';
import { welcome } from '../email/templates/welcome';
import { notification } from '../email/templates/notification';

const FROM_EMAIL = 'noreply@elixpo.com';
const FROM_NAME = 'LixBlogs';

async function send(to, { subject, html }) {
  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    return res.ok || res.status === 202;
  } catch (e) {
    console.error('Email send failed:', e?.message || e);
    return false;
  }
}

export async function sendOrgInvite(to, data) {
  return send(to, orgInvite(data));
}

export async function sendBlogInvite(to, data) {
  return send(to, blogInvite(data));
}

export async function sendWelcome(to, data) {
  return send(to, welcome(data));
}

export async function sendNotification(to, data) {
  return send(to, notification(data));
}
