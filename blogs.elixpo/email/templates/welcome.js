import { baseLayout, buttonRow, muted, escHtml } from './base.js';

/**
 * Welcome email — sent after a user completes onboarding.
 *
 * @param {object} data
 * @param {string} data.displayName  - User's display name
 * @param {string} data.username     - Username
 * @param {string} [data.avatarUrl]  - Avatar URL
 * @returns {{ subject: string, html: string }}
 */
export function welcome(data) {
  const { displayName, username } = data;
  const name = displayName || username;

  const subject = `Welcome to LixBlogs, ${name}!`;

  const body = `
    <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">Welcome aboard!</p>
    <p style="margin:0 0 32px;font-size:16px;color:#d1d5db;line-height:1.7">
      Hey <strong style="color:#ffffff">${escHtml(name)}</strong>, your LixBlogs account is ready.
      Here's what you can do next:
    </p>

    ${featureRow('Write your first blog', 'Use our block editor with AI assistance, image embeds, code blocks, and more.')}
    ${featureRow('Create an organization', 'Collaborate with your team. Invite members, create collections, publish together.')}
    ${featureRow('Complete your profile', 'Add a bio, location, social links, and pronouns so readers know who you are.')}

    ${buttonRow(
      { text: 'Start Writing', href: 'https://blogs.elixpo.com/new-blog' },
      { text: 'Visit Profile', href: `https://blogs.elixpo.com/${username}` },
    )}

    ${muted(`Your profile: <a href="https://blogs.elixpo.com/${escHtml(username)}" style="color:#9b7bf7;text-decoration:none">blogs.elixpo.com/${escHtml(username)}</a>`)}
  `;

  return {
    subject,
    html: baseLayout({ title: subject, body, preheader: `Your LixBlogs account is ready. Start writing!` }),
  };
}

function featureRow(title, desc) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px">
      <tr>
        <td style="padding:16px 20px;background-color:#111823;border:1px solid #1e2736;border-radius:10px">
          <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff">${title}</p>
          <p style="margin:5px 0 0;font-size:13px;color:#6b7f99;line-height:1.5">${desc}</p>
        </td>
      </tr>
    </table>`;
}
