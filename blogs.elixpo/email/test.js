/**
 * Email template test runner.
 *
 * Usage:
 *   node email/test.js                     # Preview all templates (writes HTML files)
 *   node email/test.js --send <template>   # Send a specific template to GMAIL_USER
 *
 * Templates: org-invite, blog-invite, welcome, notification
 *
 * Requires .env:
 *   GMAIL_USER=you@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
 */

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { sendEmail } from './send.js';
import { orgInvite } from './templates/org-invite.js';
import { blogInvite } from './templates/blog-invite.js';
import { welcome } from './templates/welcome.js';
import { notification } from './templates/notification.js';

// ── Sample data ──
const SAMPLES = {
  'org-invite': () => orgInvite({
    orgName: 'Elixpo',
    orgSlug: 'elixpo',
    orgLogoUrl: '',
    inviterName: 'selenium-cutlet',
    inviterAvatar: 'https://lh3.googleusercontent.com/a/ACg8ocJlCSczaUeHuK0Vu79xKBwghqBj60V9evGwmf0aO_k36BCZ1aE=s96-c',
    recipientName: 'Ada Lovelace',
    recipientAvatar: '',
    role: 'write',
    inviteUrl: 'https://blogs.elixpo.com/org/join/abc123',
    orgUrl: 'https://blogs.elixpo.com/elixpo',
    message: 'Hey! Come write some cool blog posts with us.',
  }),

  'blog-invite': () => blogInvite({
    blogTitle: 'Building AI-Powered Editors',
    blogEmoji: '🤖',
    inviterName: 'selenium-cutlet',
    inviterAvatar: 'https://lh3.googleusercontent.com/a/ACg8ocJlCSczaUeHuK0Vu79xKBwghqBj60V9evGwmf0aO_k36BCZ1aE=s96-c',
    recipientName: 'Ada Lovelace',
    recipientAvatar: '',
    role: 'editor',
    editUrl: 'https://blogs.elixpo.com/edit/abc123',
    message: 'Would love your input on this one!',
  }),

  'welcome': () => welcome({
    displayName: 'selenium-cutlet',
    username: 'selenium-cutlet',
    avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocJlCSczaUeHuK0Vu79xKBwghqBj60V9evGwmf0aO_k36BCZ1aE=s96-c',
  }),

  'notification-follower': () => notification({
    type: 'new_follower',
    actorName: 'Ada Lovelace',
    actorAvatar: '',
    actionUrl: 'https://blogs.elixpo.com/ada-lovelace',
  }),

  'notification-comment': () => notification({
    type: 'new_comment',
    actorName: 'Alan Turing',
    actorAvatar: '',
    blogTitle: 'Building AI-Powered Editors',
    comment: 'This is a brilliant approach to streaming LLM output into a block editor!',
    actionUrl: 'https://blogs.elixpo.com/selenium-cutlet/building-ai-powered-editors',
  }),

  'notification-published': () => notification({
    type: 'blog_published',
    actorName: 'Elixpo',
    actorAvatar: '',
    blogTitle: 'Introducing LixBlogs 2.0',
    actionUrl: 'https://blogs.elixpo.com/elixpo/introducing-lixblogs-2',
  }),

  'notification-liked': () => notification({
    type: 'blog_liked',
    actorName: 'Grace Hopper',
    actorAvatar: '',
    blogTitle: 'Building AI-Powered Editors',
    actionUrl: 'https://blogs.elixpo.com/selenium-cutlet/building-ai-powered-editors',
  }),
};

// ── CLI ──
const args = process.argv.slice(2);
const sendMode = args.includes('--send');
const templateArg = args.find(a => !a.startsWith('--'));

async function main() {
  if (sendMode) {
    // Send a specific template
    const key = templateArg || 'welcome';
    const gen = SAMPLES[key];
    if (!gen) {
      console.error(`Unknown template: ${key}`);
      console.error(`Available: ${Object.keys(SAMPLES).join(', ')}`);
      process.exit(1);
    }

    const to = process.env.SMTP_FROM_EMAIL;
    if (!to) {
      console.error('Set SMTP_FROM_EMAIL in .env to send test emails');
      process.exit(1);
    }

    const { subject, html } = gen();
    console.log(`Sending "${key}" to ${to}...`);
    const result = await sendEmail({ to, subject, html });

    if (result.ok) {
      console.log(`Sent! Message ID: ${result.messageId || '(mailchannels)'}`);
    } else {
      console.error(`Failed: ${result.error}`);
      process.exit(1);
    }
    return;
  }

  // Preview mode: write all templates to email/preview/
  const dir = new URL('./preview', import.meta.url).pathname;
  mkdirSync(dir, { recursive: true });

  for (const [name, gen] of Object.entries(SAMPLES)) {
    const { subject, html } = gen();
    const path = `${dir}/${name}.html`;
    writeFileSync(path, html);
    console.log(`  ${name}.html  —  "${subject}"`);
  }

  console.log(`\nPreview files written to email/preview/`);
  console.log(`Open them in a browser to check the design.`);
  console.log(`\nTo send a test email:  node email/test.js --send <template>`);
}

main().catch(e => { console.error(e); process.exit(1); });
