import { baseLayout, ctaButton, muted, escHtml, avatar } from './base.js';

/**
 * Generic notification email — new follower, new comment, blog published, etc.
 *
 * @param {object} data
 * @param {string} data.type          - 'new_follower' | 'new_comment' | 'blog_published' | 'blog_liked'
 * @param {string} data.actorName     - Who triggered the event
 * @param {string} [data.actorAvatar] - Actor avatar URL
 * @param {string} [data.blogTitle]   - Blog title (if relevant)
 * @param {string} [data.comment]     - Comment text (if relevant)
 * @param {string} data.actionUrl     - URL to view the activity
 * @returns {{ subject: string, html: string }}
 */
export function notification(data) {
  const { type, actorName, actorAvatar, blogTitle, comment, actionUrl } = data;

  const templates = {
    new_follower: {
      subject: `${actorName} started following you`,
      heading: `New follower`,
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> is now following you on LixBlogs.`,
      cta: 'View Profile',
    },
    new_comment: {
      subject: `${actorName} commented on "${blogTitle}"`,
      heading: `New comment`,
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> commented on <strong style="color:#ffffff">${escHtml(blogTitle)}</strong>.`,
      cta: 'View Comment',
    },
    blog_published: {
      subject: `${actorName} published "${blogTitle}"`,
      heading: `New post`,
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> published a new blog: <strong style="color:#ffffff">${escHtml(blogTitle)}</strong>.`,
      cta: 'Read Post',
    },
    blog_liked: {
      subject: `${actorName} liked "${blogTitle}"`,
      heading: `New like`,
      message: `<strong style="color:#ffffff">${escHtml(actorName)}</strong> liked your blog <strong style="color:#ffffff">${escHtml(blogTitle)}</strong>.`,
      cta: 'View Blog',
    },
  };

  const t = templates[type] || templates.new_follower;

  const body = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#6b7f99;text-transform:uppercase;letter-spacing:1px">${t.heading}</p>

    <!-- Actor card -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#0c1017;border:1px solid #1e2736;border-radius:12px;overflow:hidden">
      <tr>
        <td style="padding:16px 20px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle">
              ${avatar(actorAvatar, actorName, 40)}
            </td>
            <td style="vertical-align:middle">
              <p style="margin:0;font-size:15px;color:#d1d5db;line-height:1.5">${t.message}</p>
            </td>
          </tr></table>
        </td>
      </tr>
    </table>

    ${comment ? `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0c1017;border:1px solid #1e2736;border-radius:12px;overflow:hidden;margin-bottom:8px">
      <tr>
        <td style="padding:16px 20px;border-left:3px solid #9b7bf740">
          <p style="margin:0;font-size:13px;color:#d1d5db;line-height:1.5;font-style:italic">"${escHtml(comment)}"</p>
        </td>
      </tr>
    </table>` : ''}

    ${ctaButton(t.cta, actionUrl)}

    ${muted('You can manage your notification preferences in <a href="https://blogs.elixpo.com/settings?tab=notifications" style="color:#9b7bf7;text-decoration:none">Settings</a>.')}
  `;

  return {
    subject: t.subject,
    html: baseLayout({ title: t.subject, body, preheader: t.message.replace(/<[^>]*>/g, '') }),
  };
}
