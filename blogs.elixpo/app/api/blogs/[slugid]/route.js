export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

// DELETE /api/blogs/[slugid] — permanently delete a blog (primary author only).
// Hard delete: cascades tags/comments/likes/claps/bookmarks/views/read_history/
// co_authors/reports; FK-less subpages + collab state + media cleaned explicitly.
export async function DELETE(request, { params }) {
  const { slugid } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const blog = await db.prepare('SELECT id, author_id FROM blogs WHERE id = ?').bind(slugid).first();
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    if (blog.author_id !== session.userId) {
      return NextResponse.json({ error: 'Only the author can delete this blog' }, { status: 403 });
    }

    // Best-effort Cloudinary cleanup before the rows vanish.
    try {
      const media = await db.prepare('SELECT cloudinary_public_id FROM media_uploads WHERE blog_id = ?').bind(slugid).all();
      const ids = (media?.results || []).map(m => m.cloudinary_public_id).filter(Boolean);
      if (ids.length) {
        const { deleteFromCloudinary } = await import('../../../../lib/cloudinary');
        await Promise.allSettled(ids.map(id => deleteFromCloudinary(id)));
      }
    } catch (e) {
      console.error('Cloudinary cleanup failed (continuing):', e?.message || e);
    }

    await db.batch([
      db.prepare('DELETE FROM subpages WHERE blog_id = ?').bind(slugid),
      db.prepare('DELETE FROM blog_collab_state WHERE blog_id = ?').bind(slugid),
      db.prepare('DELETE FROM media_uploads WHERE blog_id = ?').bind(slugid),
      db.prepare('DELETE FROM blogs WHERE id = ?').bind(slugid),
    ]);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    console.error('Blog delete error:', e?.message || e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
