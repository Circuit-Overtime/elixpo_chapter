import { baseLayout, buttonRow, muted, escHtml, avatar } from './base.js';

/**
 * Org invite email — sent when a user is invited to join an organization.
 *
 * @param {object} data
 * @param {string} data.orgName       - Organization name
 * @param {string} data.orgSlug       - Org slug (for URL)
 * @param {string} [data.orgLogoUrl]  - Org logo URL
 * @param {string} data.inviterName   - Display name of the person inviting
 * @param {string} data.inviterAvatar - Avatar URL of inviter
 * @param {string} data.recipientName - Display name of the person being invited
 * @param {string} [data.recipientAvatar] - Avatar URL of recipient
 * @param {string} data.role          - Role being offered (admin, maintain, write, read)
 * @param {string} data.inviteUrl     - Full invite acceptance URL
 * @param {string} data.orgUrl        - URL to the org profile
 * @param {string} [data.message]     - Optional personal message
 * @returns {{ subject: string, html: string }}
 */
export function orgInvite(data) {
  const {
    orgName, orgSlug, orgLogoUrl,
    inviterName, inviterAvatar,
    recipientName, recipientAvatar,
    role, inviteUrl, orgUrl, message,
  } = data;

  const roleLabels = { admin: 'Admin', maintain: 'Maintainer', write: 'Writer', read: 'Reader' };
  const roleColors = { admin: '#c4b5fd', maintain: '#93c5fd', write: '#86efac', read: '#9ca3af' };
  const roleBgColors = { admin: '#9b7bf720', maintain: '#60a5fa20', write: '#4ade8020', read: '#9ca3af15' };
  const roleLabel = roleLabels[role] || role;
  const roleColor = roleColors[role] || '#9ca3af';
  const roleBg = roleBgColors[role] || '#9ca3af15';

  const subject = `You're invited to join ${orgName} on LixBlogs`;

  const body = `
    <!-- Handshake: recipient ←→ org -->
    <div style="text-align:center;padding:8px 0 32px">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
        <tr>
          <!-- Recipient avatar -->
          <td style="vertical-align:middle">
            ${avatarCircle(recipientAvatar, recipientName, 64)}
          </td>

          <!-- Connection line + handshake icon -->
          <td style="vertical-align:middle;padding:0 6px">
            <div style="position:relative;width:80px;text-align:center">
              <div style="height:2px;background:linear-gradient(90deg,#9b7bf7,#60a5fa);margin:0 auto;width:80px;border-radius:2px"></div>
              <div style="margin:-14px auto 0;width:26px;height:26px;background-color:#111823;border:2px solid #1e2736;border-radius:50%;line-height:24px;text-align:center;font-size:13px">&#129309;</div>
            </div>
          </td>

          <!-- Org avatar -->
          <td style="vertical-align:middle">
            ${avatarSquare(orgLogoUrl, orgName, 64)}
          </td>
        </tr>

        <!-- Labels under avatars -->
        <tr>
          <td style="text-align:center;padding-top:10px">
            <p style="margin:0;font-size:12px;color:#d1d5db;font-weight:600">${escHtml(recipientName || 'You')}</p>
          </td>
          <td></td>
          <td style="text-align:center;padding-top:10px">
            <p style="margin:0;font-size:12px;color:#d1d5db;font-weight:600">${escHtml(orgName)}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#5a657a">@${escHtml(orgSlug)}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Invite text (centered) -->
    <div style="text-align:center">
      <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">You're invited!</p>
      <p style="margin:0 0 20px;font-size:15px;color:#d1d5db;line-height:1.7">
        <strong style="color:#ffffff">${escHtml(inviterName)}</strong> has invited you to join
        <strong style="color:#ffffff">${escHtml(orgName)}</strong> on LixBlogs.
      </p>

      <!-- Role badge (centered) -->
      <div style="margin-bottom:28px">
        <span style="display:inline-block;padding:7px 20px;background-color:${roleBg};border:1px solid ${roleColor}30;border-radius:20px;font-size:13px;font-weight:600;color:${roleColor};letter-spacing:0.3px">
          Role: ${escHtml(roleLabel)}
        </span>
      </div>
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
            <a href="${escHtml(inviteUrl)}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block">Accept Invitation</a>
          </td>
          <td style="width:12px"></td>
          <td style="border:1px solid #f8717140;border-radius:10px;padding:13px 30px;background-color:#f8717110">
            <a href="${escHtml(orgUrl || `https://blogs.elixpo.com/${orgSlug}`)}" style="color:#f87171;font-size:14px;font-weight:600;text-decoration:none;display:inline-block">Decline</a>
          </td>
        </tr>
      </table>
    </div>

    ${muted(`If you don't want to join, you can ignore this email or decline. The invitation will expire automatically.`)}
  `;

  return {
    subject,
    html: baseLayout({ title: subject, body, preheader: `${inviterName} invited you to ${orgName}` }),
  };
}

/** Round avatar for users */
function avatarCircle(url, name, size) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="${escHtml(name)}" width="${size}" height="${size}" style="display:block;border-radius:50%;border:3px solid #1e2736;object-fit:cover" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:#1a2030;border:3px solid #1e2736;color:#7c8a9e;font-size:${Math.round(size * 0.38)}px;font-weight:700;line-height:${size}px;text-align:center">${initial}</div>`;
}

/** Rounded-square avatar for orgs */
function avatarSquare(url, name, size) {
  if (url) {
    return `<img src="${escHtml(url)}" alt="${escHtml(name)}" width="${size}" height="${size}" style="display:block;border-radius:16px;border:3px solid #1e2736;object-fit:cover" />`;
  }
  const initial = (name || '?')[0].toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:16px;background-color:#1a2030;border:3px solid #1e2736;color:#7c8a9e;font-size:${Math.round(size * 0.38)}px;font-weight:700;line-height:${size}px;text-align:center">${initial}</div>`;
}
