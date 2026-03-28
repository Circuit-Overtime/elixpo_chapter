import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getLimits } from '../../../../lib/tiers';
import { uploadToCloudinary } from '../../../../lib/cloudinary';

// Profile image types — these get overwritten (no history), no storage tracking
const PROFILE_TYPES = ['avatar', 'banner', 'org_avatar', 'org_banner'];

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const blogId = formData.get('blogId');
  const orgId = formData.get('orgId');
  const mediaType = formData.get('type') || 'image'; // image | avatar | banner | cover | org_avatar | org_banner

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const { getDB } = await import('../../../../lib/cloudflare');
  const db = getDB();

  const isProfileImage = PROFILE_TYPES.includes(mediaType);

  // For org uploads, verify membership
  if (mediaType === 'org_avatar' || mediaType === 'org_banner') {
    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }
    const membership = await db.prepare(
      'SELECT role FROM org_members WHERE org_id = ? AND user_id = ?'
    ).bind(orgId, session.userId).first();
    const org = await db.prepare('SELECT owner_id FROM orgs WHERE id = ?').bind(orgId).first();
    const isOwner = org?.owner_id === session.userId;
    const isAdmin = membership?.role === 'admin';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Not authorized to update org media' }, { status: 403 });
    }
  }

  // Storage checks only for non-profile images (blog content images)
  if (!isProfileImage) {
    const user = await db.prepare('SELECT tier, storage_used_bytes FROM users WHERE id = ?')
      .bind(session.userId).first();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const limits = getLimits(user.tier);
    const fileBytes = file.size;

    if (user.storage_used_bytes + fileBytes > limits.totalStorageBytes) {
      return NextResponse.json({
        error: 'Storage limit exceeded',
        used: user.storage_used_bytes,
        limit: limits.totalStorageBytes,
        tier: user.tier,
      }, { status: 413 });
    }

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
  }

  // Build Cloudinary folder and public_id
  let folder, publicId;
  switch (mediaType) {
    case 'avatar':
      folder = `lixblogs/users/${session.userId}`;
      publicId = 'avatar';
      break;
    case 'banner':
      folder = `lixblogs/users/${session.userId}`;
      publicId = 'banner';
      break;
    case 'org_avatar':
      folder = `lixblogs/orgs/${orgId}`;
      publicId = 'avatar';
      break;
    case 'org_banner':
      folder = `lixblogs/orgs/${orgId}`;
      publicId = 'banner';
      break;
    case 'cover':
      folder = `lixblogs/${blogId}`;
      publicId = 'cover';
      break;
    default:
      folder = `lixblogs/${blogId}`;
      publicId = crypto.randomUUID();
      break;
  }

  // Upload to Cloudinary — profile images always overwrite
  const arrayBuffer = await file.arrayBuffer();
  const result = await uploadToCloudinary(arrayBuffer, {
    folder,
    publicId,
    overwrite: isProfileImage,
  });

  // Profile images: just update the DB pointer, no storage tracking
  if (isProfileImage) {
    if (mediaType === 'avatar') {
      await db.prepare('UPDATE users SET avatar_r2_key = ? WHERE id = ?')
        .bind(result.public_id, session.userId).run();
    } else if (mediaType === 'banner') {
      await db.prepare('UPDATE users SET banner_r2_key = ? WHERE id = ?')
        .bind(result.public_id, session.userId).run();
    } else if (mediaType === 'org_avatar') {
      await db.prepare('UPDATE orgs SET logo_r2_key = ? WHERE id = ?')
        .bind(result.public_id, orgId).run();
    } else if (mediaType === 'org_banner') {
      await db.prepare('UPDATE orgs SET banner_r2_key = ? WHERE id = ?')
        .bind(result.public_id, orgId).run();
    }

    return NextResponse.json({
      publicId: result.public_id,
      url: result.secure_url,
    });
  }

  // Blog content images: track in media_uploads + update storage
  const fileBytes = file.size;
  const mediaId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(`
    INSERT INTO media_uploads (id, user_id, blog_id, cloudinary_public_id, size_bytes, media_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(mediaId, session.userId, blogId || null, result.public_id, fileBytes, mediaType, now).run();

  await db.prepare('UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?')
    .bind(fileBytes, session.userId).run();

  return NextResponse.json({
    id: mediaId,
    publicId: result.public_id,
    url: result.secure_url,
    sizeBytes: fileBytes,
  });
}
