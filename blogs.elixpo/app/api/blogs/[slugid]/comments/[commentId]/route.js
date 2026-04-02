export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../../lib/auth';

// PUT — edit own comment
export async function PUT(request, { params }) {
  const { slugid, commentId } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { content } = await request.json();
  if (!content?.trim() || content.trim().length > 5000) {
    return NextResponse.json({ error: 'Comment must be 1-5000 characters' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../../../lib/cloudflare');
    const db = getDB();

    const comment = await db.prepare('SELECT user_id FROM comments WHERE id = ? AND blog_id = ?').bind(commentId, slugid).first();
    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    if (comment.user_id !== session.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await db.prepare('UPDATE comments SET content = ?, updated_at = unixepoch() WHERE id = ?')
      .bind(content.trim(), commentId).run();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE — delete own comment (or blog author can delete any)
export async function DELETE(request, { params }) {
  const { slugid, commentId } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { getDB } = await import('../../../../../../lib/cloudflare');
    const db = getDB();

    const comment = await db.prepare('SELECT user_id, parent_id FROM comments WHERE id = ? AND blog_id = ?').bind(commentId, slugid).first();
    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(slugid).first();
    const isOwner = comment.user_id === session.userId;
    const isBlogAuthor = blog?.author_id === session.userId;

    if (!isOwner && !isBlogAuthor) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    // If top-level, delete all replies too
    let deleted = 1;
    if (!comment.parent_id) {
      const replyCount = await db.prepare('SELECT COUNT(*) as c FROM comments WHERE parent_id = ?').bind(commentId).first();
      deleted += replyCount?.c || 0;
      await db.prepare('DELETE FROM comments WHERE parent_id = ?').bind(commentId).run();
    }
    await db.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();

    // Decrement denormalized count + invalidate cache
    await db.prepare('UPDATE blogs SET comment_count = MAX(0, comment_count - ?) WHERE id = ?').bind(deleted, slugid).run();
    try { const { kvInvalidate } = await import('../../../../../../lib/cache'); await kvInvalidate(`v1:interactions:${slugid}`); } catch {}

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
