export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

// GET — list comments with replies
export async function GET(request, { params }) {
  const { slugid } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    // Get top-level comments
    const topLevel = await db.prepare(`
      SELECT c.id, c.content, c.parent_id, c.created_at, c.updated_at,
        u.id as user_id, u.username, u.display_name, u.avatar_url
      FROM comments c JOIN users u ON u.id = c.user_id
      WHERE c.blog_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(slugid, limit, offset).all();

    const comments = topLevel?.results || [];

    // Get replies for all top-level comments (max 100 per parent)
    if (comments.length > 0) {
      const parentIds = comments.map(c => c.id);
      const placeholders = parentIds.map(() => '?').join(',');
      const replies = await db.prepare(`
        SELECT c.id, c.content, c.parent_id, c.created_at, c.updated_at,
          u.id as user_id, u.username, u.display_name, u.avatar_url
        FROM comments c JOIN users u ON u.id = c.user_id
        WHERE c.parent_id IN (${placeholders})
        ORDER BY c.created_at ASC
      `).bind(...parentIds).all();

      const replyMap = {};
      for (const r of (replies?.results || [])) {
        if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
        replyMap[r.parent_id].push(r);
      }

      for (const c of comments) {
        c.replies = (replyMap[c.id] || []).slice(0, 100);
        c.reply_count = (replyMap[c.id] || []).length;
      }
    }

    const total = await db.prepare('SELECT COUNT(*) as c FROM comments WHERE blog_id = ? AND parent_id IS NULL').bind(slugid).first();

    return NextResponse.json({ comments, total: total?.c || 0, page, hasMore: comments.length === limit });
  } catch (e) {
    console.error('Comments fetch error:', e);
    return NextResponse.json({ comments: [], total: 0 });
  }
}

// POST — create comment or reply
export async function POST(request, { params }) {
  const { slugid } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { content, parentId } = await request.json();
  if (!content?.trim() || content.trim().length > 5000) {
    return NextResponse.json({ error: 'Comment must be 1-5000 characters' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    // Check blog allows comments
    const blog = await db.prepare('SELECT id, author_id, title, allow_comments FROM blogs WHERE id = ?').bind(slugid).first();
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    if (!blog.allow_comments) return NextResponse.json({ error: 'Comments are disabled' }, { status: 403 });

    // If reply, validate parent
    if (parentId) {
      const parent = await db.prepare('SELECT id, parent_id, user_id FROM comments WHERE id = ? AND blog_id = ?').bind(parentId, slugid).first();
      if (!parent) return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      if (parent.parent_id) return NextResponse.json({ error: 'Cannot reply to a reply' }, { status: 400 });

      const replyCount = await db.prepare('SELECT COUNT(*) as c FROM comments WHERE parent_id = ?').bind(parentId).first();
      if ((replyCount?.c || 0) >= 100) return NextResponse.json({ error: 'Reply limit reached (100)' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      INSERT INTO comments (id, blog_id, user_id, parent_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, slugid, session.userId, parentId || null, content.trim(), now, now).run();

    // Increment denormalized count + invalidate cache
    await db.prepare('UPDATE blogs SET comment_count = comment_count + 1 WHERE id = ?').bind(slugid).run();
    try { const { kvInvalidate } = await import('../../../../../lib/cache'); await kvInvalidate(`v1:interactions:${slugid}`); } catch {}

    // Notify blog author (if not self)
    try {
      const user = await db.prepare('SELECT username, display_name, avatar_url FROM users WHERE id = ?').bind(session.userId).first();
      const { notify } = await import('../../../../../lib/notify');

      if (blog.author_id !== session.userId) {
        await notify(db, {
          userId: blog.author_id, type: 'comment',
          actorId: session.userId, actorName: user?.display_name || user?.username,
          actorAvatar: user?.avatar_url, targetId: slugid,
          targetTitle: blog.title, targetUrl: `/${user?.username}/${blog.slug || slugid}`,
        });
      }

      // Notify parent comment author if reply (and not self)
      if (parentId) {
        const parent = await db.prepare('SELECT user_id FROM comments WHERE id = ?').bind(parentId).first();
        if (parent && parent.user_id !== session.userId && parent.user_id !== blog.author_id) {
          await notify(db, {
            userId: parent.user_id, type: 'mention',
            actorId: session.userId, actorName: user?.display_name || user?.username,
            actorAvatar: user?.avatar_url, targetId: slugid,
            targetTitle: blog.title, targetUrl: `/${user?.username}/${blog.slug || slugid}`,
          });
        }
      }
    } catch {}

    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('Comment create error:', e);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
