import { baseLayout, muted, escHtml } from './base.js';

/**
 * Blog collaboration invite — sent when a user is invited as a co-author.
 *
 * @param {object} data
 * @param {string} data.blogTitle          - Blog title
 * @param {string} [data.blogEmoji]        - Page emoji
 * @param {string} data.inviterName        - Who is inviting
 * @param {string} [data.inviterAvatar]    - Inviter avatar URL
 * @param {string} data.recipientName      - Who is being invited
 * @param {string} [data.recipientAvatar]  - Recipient avatar URL
 * @param {string} data.role               - Co-author role (viewer, editor, admin)
 * @param {string} data.editUrl            - URL to the blog editor
 * @param {string} [data.message]          - Optional personal note
 * @returns {{ subject: string, html: string }}
 */
export function blogInvite(data) {
  const {
    blogTitle, blogEmoji,
    inviterName, inviterAvatar,
    recipientName, recipientAvatar,
    role, editUrl, message,
  } = data;

  const roleLabels = { viewer: 'Viewer', editor: 'Editor', admin: 'Admin' };
  const roleColors = { viewer: '#9ca3af', editor: '#c4b5fd', admin: '#fbbf24' };
  const roleBgColors = { viewer: '#9ca3af15', editor: '#9b7bf720', admin: '#fbbf2420' };
  const roleLabel = roleLabels[role] || role;
  const roleColor = roleColors[role] || '#c4b5fd';
  const roleBg = roleBgColors[role] || '#9b7bf720';
  const displayTitle = blogEmoji ? `${blogEmoji} ${blogTitle}` : blogTitle;

  const subject = `${inviterName} invited you to collaborate on "${blogTitle}"`;

  const body = `
    <!-- Handshake: inviter ←→ recipient -->
    <div style="text-align:center;padding:8px 0 28px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr>
          <td style="vertical-align:middle">
            ${avatarCircle(inviterAvatar, inviterName, 60)}
          </td>
          <td style="vertical-align:middle;padding:0 6px">
            <div style="position:relative;width:72px;text-align:center">
              <div style="height:2px;background:linear-gradient(90deg,#9b7bf7,#60a5fa);margin:0 auto;width:72px;border-radius:2px"></div>
              <div style="margin:-14px auto 0;width:26px;height:26px;background-color:#111823;border:2px solid #1e2736;border-radius:50%;line-height:24px;text-align:center;font-size:13px">&#9997;&#65039;</div>
            </div>
          </td>
          <td style="vertical-align:middle">
            ${avatarCircle(recipientAvatar, recipientName, 60)}
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding-top:10px">
            <p style="margin:0;font-size:12px;color:#d1d5db;font-weight:600">${escHtml(inviterName)}</p>
          </td>
          <td></td>
          <td style="text-align:center;padding-top:10px">
            <p style="margin:0;font-size:12px;color:#d1d5db;font-weight:600">${escHtml(recipientName || 'You')}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Invite text (centered) -->
    <div style="text-align:center">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">Let's co-author!</p>
      <p style="margin:0 0 20px;font-size:15px;color:#d1d5db;line-height:1.7">
        <strong style="color:#ffffff">${escHtml(inviterName)}</strong> wants you to collaborate on a blog post.
      </p>
    </div>

    <!-- Blog card -->
    <div style="background-color:#111823;border:1px solid #1e2736;border-radius:12px;padding:20px 24px;margin-bottom:20px">
      <p style="margin:0;font-size:19px;font-weight:700;color:#ffffff;line-height:1.4">${escHtml(displayTitle || 'Untitled')}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7f99">by ${escHtml(inviterName)}</p>
    </div>

    <!-- Role badge (centered) -->
    <div style="text-align:center;margin-bottom:24px">
      <span style="display:inline-block;padding:7px 20px;background-color:${roleBg};border:1px solid ${roleColor}30;border-radius:20px;font-size:13px;font-weight:600;color:${roleColor};letter-spacing:0.3px">
        Role: ${escHtml(roleLabel)}
      </span>
    </div>

    ${message ? `
    <!-- Personal message -->
    <div style="border-left:3px solid #9b7bf740;padding:14px 20px;background-color:#111823;border-radius:0 10px 10px 0;margin-bottom:28px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:12px;vertical-align:top">
          ${avatarCircle(inviterAvatar, inviterName, 28)}
        </td>
        <td style="vertical-align:top">
          <p style="margin:0;font-size:11px;color:#5a657a;font-weight:600">${escHtml(inviterName)}</p>
          <p style="margin:5px 0 0;font-size:14px;color:#d1d5db;line-height:1.55;font-style:italic">&ldquo;${escHtml(message)}&rdquo;</p>
        </td>
      </tr></table>
    </div>` : ''}

    <!-- Accept / Decline buttons (centered) -->
    <div style="text-align:center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr>
          <td style="background-color:#9b7bf7;border-radius:10px;padding:13px 30px">
            <a href="${escHtml(editUrl)}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block">Open in Editor</a>
          </td>
          <td style="width:12px"></td>
          <td style="border:1px solid #f8717140;border-radius:10px;padding:13px 30px;background-color:#f8717110">
            <a href="${escHtml(editUrl)}" style="color:#f87171;font-size:14px;font-weight:600;text-decoration:none;display:inline-block">Decline</a>
          </td>
        </tr>
      </table>
    </div>

    ${muted(`If you don't recognize this invitation, you can safely ignore it or decline.`)}
  `;

  return {
    subject,
    html: baseLayout({ title: subject, body, preheader: `Collaborate on "${blogTitle}" with ${inviterName}` }),
  };
}

function avatarCircle(url, name, size) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="${escHtml(name)}" width="${size}" height="${size}" style="display:block;border-radius:50%;border:3px solid #1e2736;object-fit:cover" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:#1a2030;border:3px solid #1e2736;color:#7c8a9e;font-size:${Math.round(size * 0.38)}px;font-weight:700;line-height:${size}px;text-align:center">${initial}</div>`;
}
