import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getLimits } from '../../../../lib/tiers';
import { uploadToCloudinary, deleteFromCloudinary, getCloudinaryUrl } from '../../../../lib/cloudinary';

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const blogId = formData.get('blogId');
  const mediaType = formData.get('type') || 'image'; // image | avatar | banner | cover

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const { getDB } = await import('../../../../lib/cloudflare');
  const db = getDB();

  const user = await db.prepare('SELECT tier, storage_used_bytes FROM users WHERE id = ?')
    .bind(session.userId).first();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const limits = getLimits(user.tier);
  const fileBytes = file.size;

  // Check total storage limit
  if (user.storage_used_bytes + fileBytes > limits.totalStorageBytes) {
    return NextResponse.json({
      error: 'Storage limit exceeded',
      used: user.storage_used_bytes,
      limit: limits.totalStorageBytes,
      tier: user.tier,
    }, { status: 413 });
  }

  // Check per-blog image limit
  if (blogId) {
    const blogUsage = await db.prepare(
      'SELECT COALESCE(SUM(size_bytes), 0) as total FROM media_uploads WHERE blog_id = ?'
    ).bind(blogId).first();

    if (blogUsage.total + fileBytes > limits.imagePerBlogBytes) {
      return NextResponse.json({
        error: 'Per-blog image limit exceeded',
        used: blogUsage.total,
        limit: limits.imagePerBlogBytes,
        tier: user.tier,
      }, { status: 413 });
    }
  }

  // Build Cloudinary folder and public_id
  let folder, publicId;
  if (mediaType === 'avatar') {
    folder = `lixblogs/users/${session.userId}`;
    publicId = 'avatar';
  } else if (mediaType === 'banner') {
    folder = `lixblogs/users/${session.userId}`;
    publicId = 'banner';
  } else if (mediaType === 'cover' && blogId) {
    folder = `lixblogs/${blogId}`;
    publicId = 'cover';
  } else if (blogId) {
    folder = `lixblogs/${blogId}`;
    publicId = crypto.randomUUID();
  } else {
    folder = `lixblogs/users/${session.userId}`;
    publicId = crypto.randomUUID();
  }

  const fullPublicId = `${folder}/${publicId}`;

  // For avatar/banner/cover, delete old file first
  if (mediaType === 'avatar' || mediaType === 'banner' || mediaType === 'cover') {
    const old = await db.prepare('SELECT id, size_bytes, cloudinary_public_id FROM media_uploads WHERE cloudinary_public_id = ?')
      .bind(fullPublicId).first();
    if (old) {
      try { await deleteFromCloudinary(old.cloudinary_public_id); } catch { /* ok if missing */ }
      await db.prepare('DELETE FROM media_uploads WHERE id = ?').bind(old.id).run();
      await db.prepare('UPDATE users SET storage_used_bytes = MAX(0, storage_used_bytes - ?) WHERE id = ?')
        .bind(old.size_bytes, session.userId).run();
    }
  }

  // Upload to Cloudinary
  const arrayBuffer = await file.arrayBuffer();
  const result = await uploadToCloudinary(arrayBuffer, { folder, publicId });

  // Track in media_uploads
  const mediaId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    INSERT INTO media_uploads (id, user_id, blog_id, cloudinary_public_id, size_bytes, media_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(mediaId, session.userId, blogId || null, result.public_id, fileBytes, mediaType, now).run();

  // Update user storage
  await db.prepare('UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?')
    .bind(fileBytes, session.userId).run();

  // Update user profile keys if avatar/banner
  if (mediaType === 'avatar') {
    await db.prepare('UPDATE users SET avatar_r2_key = ? WHERE id = ?').bind(result.public_id, session.userId).run();
  } else if (mediaType === 'banner') {
    await db.prepare('UPDATE users SET banner_r2_key = ? WHERE id = ?').bind(result.public_id, session.userId).run();
  }

  return NextResponse.json({
    id: mediaId,
    publicId: result.public_id,
    url: result.secure_url,
    sizeBytes: fileBytes,
  });
}
