/**
 * Base email layout wrapper — full-width, no card container.
 * Includes a signature quote in the footer as a LixBlogs trademark.
 *
 * @param {object} opts
 * @param {string} opts.title    - Email subject / preview title
 * @param {string} opts.body     - Inner HTML content
 * @param {string} [opts.preheader] - Hidden preheader text for inbox preview
 * @returns {string} Full HTML email
 */
export function baseLayout({ title, body, preheader = '' }) {
  const { text: quoteText, author: quoteAuthor } = pickQuote();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escHtml(title)}</title>
  <!--[if mso]>
  <style>body,table,td{font-family:Arial,Helvetica,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0c1017;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#e8edf5;-webkit-text-size-adjust:100%;width:100%;min-width:100%">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escHtml(preheader)}${'&zwnj;&nbsp;'.repeat(30)}</div>` : ''}

  <!-- Header -->
  <div style="padding:28px 24px 24px">
    <img src="https://res.cloudinary.com/ds4qzqb4y/image/upload/v1774947344/lixblogs/logo.png" alt="LixBlogs" width="30" height="30" style="display:inline-block;border-radius:8px;vertical-align:middle" />
    <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;vertical-align:middle;margin-left:8px">LixBlogs</span>
  </div>

  <!-- Accent line -->
  <div style="height:2px;background:linear-gradient(90deg,#9b7bf7 0%,#60a5fa 50%,#4ade80 100%);opacity:0.6"></div>

  <!-- Body -->
  <div style="padding:40px 24px 48px">
    ${body}
  </div>

  <!-- Quote -->
  <div style="padding:0 24px 36px">
    <div style="border-left:3px solid #9b7bf7;padding:20px 24px;background-color:#111823;border-radius:0 10px 10px 0">
      <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.65;font-style:italic">&ldquo;${quoteText}&rdquo;</p>
      <p style="margin:10px 0 0;font-size:12px;color:#5a657a;font-weight:600">&mdash; ${quoteAuthor}</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1e2736;padding:24px 24px 32px">
    <p style="margin:0;font-size:12px;color:#5a657a;line-height:1.6">
      You received this email because of your account on
      <a href="https://blogs.elixpo.com" style="color:#9b7bf7;text-decoration:none">LixBlogs</a>.
    </p>
    <p style="margin:8px 0 0;font-size:11px;color:#4a5568">
      &copy; ${new Date().getFullYear()} Elixpo &middot;
      <a href="https://blogs.elixpo.com/about" style="color:#5a657a;text-decoration:none">About</a> &middot;
      <a href="https://blogs.elixpo.com/settings?tab=notifications" style="color:#5a657a;text-decoration:none">Unsubscribe</a>
    </p>
  </div>

</body>
</html>`;
}

// ─── Quotes ─────────────────────────────────────────────────────────────
const QUOTES = [
  { text: 'The scariest moment is always just before you start.', author: 'Stephen King' },
  { text: 'Start writing, no matter what. The water does not flow until the faucet is turned on.', author: 'Louis L\'Amour' },
  { text: 'There is no greater agony than bearing an untold story inside you.', author: 'Maya Angelou' },
  { text: 'You can always edit a bad page. You can\'t edit a blank page.', author: 'Jodi Picoult' },
  { text: 'A writer is someone for whom writing is more difficult than it is for other people.', author: 'Thomas Mann' },
  { text: 'If you want to be a writer, you must do two things above all others: read a lot and write a lot.', author: 'Stephen King' },
  { text: 'The first draft is just you telling yourself the story.', author: 'Terry Pratchett' },
  { text: 'Write what should not be forgotten.', author: 'Isabel Allende' },
  { text: 'We write to taste life twice, in the moment and in retrospect.', author: 'Anaïs Nin' },
  { text: 'Either write something worth reading or do something worth writing.', author: 'Benjamin Franklin' },
  { text: 'Ideas are like rabbits. You get a couple and learn how to handle them, and pretty soon you have a dozen.', author: 'John Steinbeck' },
  { text: 'One day I will find the right words, and they will be simple.', author: 'Jack Kerouac' },
  { text: 'Fill your paper with the breathings of your heart.', author: 'William Wordsworth' },
  { text: 'Writing is thinking on paper.', author: 'William Zinsser' },
  { text: 'All you have to do is write one true sentence. Write the truest sentence that you know.', author: 'Ernest Hemingway' },
];

function pickQuote() {
  // Deterministic per day so every email sent the same day has the same quote
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Escape HTML entities */
export function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Reusable primary CTA button */
export function ctaButton(text, href) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px">
      <tr>
        <td style="background-color:#9b7bf7;border-radius:10px;padding:13px 30px">
          <a href="${escHtml(href)}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;letter-spacing:0.2px">${escHtml(text)}</a>
        </td>
      </tr>
    </table>`;
}

/** Two buttons side by side: primary + secondary outline */
export function buttonRow(primary, secondary) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px">
      <tr>
        <td style="background-color:#9b7bf7;border-radius:10px;padding:13px 30px">
          <a href="${escHtml(primary.href)}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;letter-spacing:0.2px">${escHtml(primary.text)}</a>
        </td>
        <td style="width:12px"></td>
        <td style="border:1px solid #2d3a4d;border-radius:10px;padding:13px 30px;background-color:#111823">
          <a href="${escHtml(secondary.href)}" style="color:#d1d5db;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;letter-spacing:0.2px">${escHtml(secondary.text)}</a>
        </td>
      </tr>
    </table>`;
}

/** Secondary muted link */
export function secondaryLink(text, href) {
  return `<a href="${escHtml(href)}" style="color:#9b7bf7;font-size:13px;text-decoration:none">${escHtml(text)}</a>`;
}

/** Small muted paragraph */
export function muted(text) {
  return `<p style="margin:16px 0 0;font-size:12px;color:#6b7f99;line-height:1.5">${text}</p>`;
}

/** Divider with subtle gradient */
export function divider() {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0">
      <tr><td><div style="height:1px;background:linear-gradient(90deg,transparent 0%,#1e2736 20%,#1e2736 80%,transparent 100%)"></div></td></tr>
    </table>`;
}

/** Avatar circle (inline) */
export function avatar(url, name, size = 40) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="" width="${size}" height="${size}" style="border-radius:50%;display:block;object-fit:cover" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:#1a2030;color:#7c8a9e;font-size:${Math.round(size * 0.4)}px;font-weight:700;line-height:${size}px;text-align:center">${initial}</div>`;
}
