export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { deleteFromCloudinary } from '../../../../lib/cloudinary';

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { mediaId } = await request.json();
  if (!mediaId) {
    return NextResponse.json({ error: 'Missing mediaId' }, { status: 400 });
  }

  const { getDB } = await import('../../../../lib/cloudflare');
  const db = getDB();

  // Only allow deleting own media
  const media = await db.prepare(
    'SELECT id, blog_id, media_type, cloudinary_public_id, size_bytes FROM media_uploads WHERE id = ? AND user_id = ?'
  ).bind(mediaId, session.userId).first();

  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // Delete from Cloudinary
  await deleteFromCloudinary(media.cloudinary_public_id);

  await db.prepare('DELETE FROM media_uploads WHERE id = ?').bind(mediaId).run();
  if (media.media_type === 'cover' && media.blog_id) {
    await db.prepare('UPDATE blogs SET cover_image_r2_key = NULL, updated_at = ? WHERE id = ?')
      .bind(Math.floor(Date.now() / 1000), media.blog_id).run();
  }
  await db.prepare(`UPDATE users SET storage_used_bytes = (
    SELECT COALESCE(SUM(size_bytes), 0) FROM media_uploads WHERE user_id = ?
  ) WHERE id = ?`).bind(session.userId, session.userId).run();

  return NextResponse.json({ ok: true });
}
