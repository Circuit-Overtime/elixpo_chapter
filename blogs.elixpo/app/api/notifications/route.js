export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';

// GET /api/notifications — fetch user's notifications
export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();

    const [notifications, unreadCount] = await Promise.all([
      db.prepare(`
        SELECT id, type, actor_id, actor_name, actor_avatar, target_id, target_title, target_url, read, created_at
        FROM notifications WHERE user_id = ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).bind(session.userId, limit, offset).all(),
      db.prepare(
        'SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0'
      ).bind(session.userId).first(),
    ]);

    return NextResponse.json({
      notifications: notifications?.results || [],
      unread: unreadCount?.c || 0,
    });
  } catch (e) {
    console.error('Notifications fetch error:', e);
    return NextResponse.json({ notifications: [], unread: 0 });
  }
}

// PUT /api/notifications — mark as read
export async function PUT(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, all } = await request.json();

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();

    if (all) {
      await db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0')
        .bind(session.userId).run();
    } else if (id) {
      await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
        .bind(id, session.userId).run();
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Notification mark-read error:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
