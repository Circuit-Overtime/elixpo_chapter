/**
 * Server-side notification helper.
 * Call from any API route to create an in-app notification.
 *
 * Usage:
 *   import { notify } from '../../../lib/notify';
 *   await notify(db, {
 *     userId: 'recipient-id',
 *     type: 'follow',
 *     actorId: 'who-did-it',
 *     actorName: 'username',
 *     actorAvatar: 'https://...',
 *     targetId: null,
 *     targetTitle: null,
 *     targetUrl: '/username',
 *   });
 */

/**
 * @param {D1Database} db
 * @param {object} opts
 * @param {string} opts.userId        - Who receives the notification
 * @param {string} opts.type          - follow | comment | like | mention | org_invite | blog_invite | blog_published
 * @param {string} [opts.actorId]     - Who triggered it
 * @param {string} [opts.actorName]   - Display name of actor
 * @param {string} [opts.actorAvatar] - Avatar URL of actor
 * @param {string} [opts.targetId]    - Blog/org/comment ID
 * @param {string} [opts.targetTitle] - Blog title, org name, etc.
 * @param {string} [opts.targetUrl]   - URL to navigate to
 */
export async function notify(db, opts) {
  // Don't notify yourself
  if (opts.actorId && opts.actorId === opts.userId) return;

  try {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      INSERT INTO notifications (id, user_id, type, actor_id, actor_name, actor_avatar, target_id, target_title, target_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      opts.userId,
      opts.type,
      opts.actorId || null,
      opts.actorName || null,
      opts.actorAvatar || null,
      opts.targetId || null,
      opts.targetTitle || null,
      opts.targetUrl || null,
      now,
    ).run();
  } catch (e) {
    console.error('Failed to create notification:', e?.message || e);
  }
}

/**
 * Notify multiple users at once (e.g. all org members, all followers).
 */
export async function notifyMany(db, userIds, opts) {
  const filtered = userIds.filter(id => id !== opts.actorId);
  await Promise.all(filtered.map(userId => notify(db, { ...opts, userId })));
}
