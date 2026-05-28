export const runtime = 'edge';
import { NextResponse } from 'next/server';

// Admin moderation endpoint, called by the GitHub moderation workflow.
// Auth: shared secret in the `x-moderation-secret` header (fail closed).
//
// Body: { action: 'takedown' | 'dismiss', blogId }
//   takedown — HARD DELETE the blog (+ subpages, collab state, media) and email the author.
//   dismiss  — clear reports; restore visibility if it was auto-hidden (under_review → published).
export async function POST(request) {
  const secret = process.env.MODERATION_SECRET || '';
  const provided = request.headers.get('x-moderation-secret') || '';
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch {}
  const action = String(body.action || '');
  const blogId = String(body.blogId || '');
  if (!blogId || !['takedown', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'Missing/invalid action or blogId' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const blog = await db.prepare(
      `SELECT b.id, b.title, b.status, b.author_id, u.email AS author_email, u.display_name AS author_name
       FROM blogs b JOIN users u ON u.id = b.author_id WHERE b.id = ?`
    ).bind(blogId).first();
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

    if (action === 'dismiss') {
      await db.batch([
        db.prepare("UPDATE blogs SET status = 'published' WHERE id = ? AND status = 'under_review'").bind(blogId),
        db.prepare("UPDATE reports SET status = 'dismissed' WHERE blog_id = ?").bind(blogId),
      ]);
      return NextResponse.json({ ok: true, action: 'dismiss', restored: blog.status === 'under_review' });
    }

    // ── takedown: hard delete ──
    // Best-effort Cloudinary cleanup before the rows vanish.
    try {
      const media = await db.prepare('SELECT cloudinary_public_id FROM media_uploads WHERE blog_id = ?').bind(blogId).all();
      const ids = (media?.results || []).map(m => m.cloudinary_public_id).filter(Boolean);
      if (ids.length) {
        const { deleteFromCloudinary } = await import('../../../../lib/cloudinary');
        await Promise.allSettled(ids.map(id => deleteFromCloudinary(id)));
      }
    } catch (e) {
      console.error('Cloudinary cleanup failed (continuing):', e?.message || e);
    }

    // Delete FK-less children explicitly, then the blog (cascades tags/comments/
    // likes/claps/bookmarks/views/read_history/co_authors/reports; media_uploads → NULL).
    await db.batch([
      db.prepare('DELETE FROM subpages WHERE blog_id = ?').bind(blogId),
      db.prepare('DELETE FROM blog_collab_state WHERE blog_id = ?').bind(blogId),
      db.prepare('DELETE FROM media_uploads WHERE blog_id = ?').bind(blogId),
      db.prepare('DELETE FROM blogs WHERE id = ?').bind(blogId),
    ]);

    // Notify the author by email (best-effort).
    if (blog.author_email) {
      try {
        const { sendBlogRemoved } = await import('../../../../lib/email');
        await sendBlogRemoved(blog.author_email, { displayName: blog.author_name || '', title: blog.title || 'your post' });
      } catch (e) {
        console.error('Removal email failed:', e?.message || e);
      }
    }

    return NextResponse.json({ ok: true, action: 'takedown', deleted: true });
  } catch (e) {
    console.error('Moderation action error:', e?.message || e);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
