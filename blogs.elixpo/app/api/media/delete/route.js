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
    'SELECT id, cloudinary_public_id, size_bytes FROM media_uploads WHERE id = ? AND user_id = ?'
  ).bind(mediaId, session.userId).first();

  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  // Delete from Cloudinary
  await deleteFromCloudinary(media.cloudinary_public_id);

  // Remove record and update storage
  await db.batch([
    db.prepare('DELETE FROM media_uploads WHERE id = ?').bind(mediaId),
    db.prepare('UPDATE users SET storage_used_bytes = MAX(0, storage_used_bytes - ?) WHERE id = ?')
      .bind(media.size_bytes, session.userId),
  ]);

  return NextResponse.json({ ok: true });
}
