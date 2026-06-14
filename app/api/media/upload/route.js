export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getLimits } from '../../../../lib/tiers';
import { MAX_MEDIA_PER_BLOG, MAX_BLOG_IMAGE_BYTES } from '../../../../lib/limits';
import { uploadToCloudinary } from '../../../../lib/cloudinary';
import { isAllowedMime, ALLOWED_IMAGE_MIME_TYPES } from '../../../../src/utils/allowedImageTypes';

// Profile image types — these get overwritten (no history), no storage tracking
const PROFILE_TYPES = ['avatar', 'banner', 'org_avatar', 'org_banner'];

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const blogId = formData.get('blogId');
    const orgId = formData.get('orgId');
    const mediaType = formData.get('type') || 'image';

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Static-image allowlist enforcement. Anything outside the canonical
    // mime list is rejected here regardless of caller — animated GIFs,
    // HEIC, PDFs, video, audio, etc. cannot reach Cloudinary.
    if (!isAllowedMime(file.type)) {
      return NextResponse.json({
        error: 'Unsupported file type',
        allowed: ALLOWED_IMAGE_MIME_TYPES,
        received: file.type || 'unknown',
      }, { status: 415 });
    }

    console.log(`[media/upload] type=${mediaType} size=${file.size} mime=${file.type} blogId=${blogId} user=${session.userId}`);

    let db;
    try {
      const { getDB } = await import('../../../../lib/cloudflare');
      db = getDB();
    } catch (e) {
      console.warn('[media/upload] D1 not available, skipping DB checks:', e.message);
    }

    const isProfileImage = PROFILE_TYPES.includes(mediaType);

    // For org uploads, verify membership
    if (db && (mediaType === 'org_avatar' || mediaType === 'org_banner')) {
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
    if (db && !isProfileImage) {
      try {
        const user = await db.prepare('SELECT tier, storage_used_bytes FROM users WHERE id = ?')
          .bind(session.userId).first();

        if (!user) {
          console.warn('[media/upload] User not found in DB, skipping storage checks');
        } else {
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
              'SELECT COALESCE(SUM(size_bytes), 0) as total, COUNT(*) as n FROM media_uploads WHERE blog_id = ?'
            ).bind(blogId).first();

            if (blogUsage.total + fileBytes > MAX_BLOG_IMAGE_BYTES) {
              return NextResponse.json({
                error: 'Per-blog image limit exceeded (max 10 MB of images per blog)',
                used: blogUsage.total,
                limit: MAX_BLOG_IMAGE_BYTES,
              }, { status: 413 });
            }

            if ((blogUsage.n || 0) >= MAX_MEDIA_PER_BLOG) {
              return NextResponse.json({
                error: 'Image count limit reached for this blog',
                count: blogUsage.n,
                limit: MAX_MEDIA_PER_BLOG,
              }, { status: 413 });
            }
          }
        }
      } catch (e) {
        console.warn('[media/upload] Storage check failed, continuing:', e.message);
      }
    }

    // Build Cloudinary folder and public_id
    // Avatars use deterministic slug-based paths so URLs are stable and human-readable
    let folder, publicId;
    switch (mediaType) {
      case 'avatar': {
        // Deterministic: lixblogs/avatars/users/{username}
        let username = session.userId;
        if (db) {
          const u = await db.prepare('SELECT username FROM users WHERE id = ?').bind(session.userId).first();
          if (u?.username) username = u.username;
        }
        folder = 'lixblogs/avatars/users';
        publicId = username;
        break;
      }
      case 'banner':
        folder = `lixblogs/users/${session.userId}`;
        publicId = 'banner';
        break;
      case 'org_avatar': {
        // Deterministic: lixblogs/avatars/orgs/{slug}
        let orgSlug = orgId;
        if (db) {
          const o = await db.prepare('SELECT slug FROM orgs WHERE id = ?').bind(orgId).first();
          if (o?.slug) orgSlug = o.slug;
        }
        folder = 'lixblogs/avatars/orgs';
        publicId = orgSlug;
        break;
      }
      case 'org_banner':
        folder = `lixblogs/orgs/${orgId}`;
        publicId = 'banner';
        break;
      case 'cover':
        folder = `lixblogs/${blogId}`;
        publicId = 'cover';
        break;
      default:
        folder = `lixblogs/${blogId || 'unsorted'}`;
        publicId = crypto.randomUUID();
        break;
    }

    console.log(`[media/upload] Uploading to Cloudinary: folder=${folder} publicId=${publicId}`);

    // Upload to Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    let result;
    try {
      result = await uploadToCloudinary(arrayBuffer, {
        folder,
        publicId,
        overwrite: isProfileImage,
      });
      console.log(`[media/upload] Cloudinary success: ${result.secure_url} (${result.bytes} bytes)`);
    } catch (e) {
      console.error('[media/upload] Cloudinary upload failed:', e.message);
      return NextResponse.json({ error: `Cloudinary upload failed: ${e.message}` }, { status: 502 });
    }

    // Profile images: just update the DB pointer, no storage tracking
    if (isProfileImage) {
      if (db) {
        try {
          if (mediaType === 'avatar') {
            // Display reads avatar_url, so set both (else the new avatar won't show).
            await db.prepare('UPDATE users SET avatar_r2_key = ?, avatar_url = ? WHERE id = ?')
              .bind(result.public_id, result.secure_url, session.userId).run();
          } else if (mediaType === 'banner') {
            await db.prepare('UPDATE users SET banner_r2_key = ? WHERE id = ?')
              .bind(result.public_id, session.userId).run();
          } else if (mediaType === 'org_avatar') {
            // Org UI reads logo_url for display — set both so the new logo shows.
            await db.prepare('UPDATE orgs SET logo_r2_key = ?, logo_url = ? WHERE id = ?')
              .bind(result.public_id, result.secure_url, orgId).run();
          } else if (mediaType === 'org_banner') {
            await db.prepare('UPDATE orgs SET banner_r2_key = ?, banner_url = ? WHERE id = ?')
              .bind(result.public_id, result.secure_url, orgId).run();
          }
          // Bust the cached profile so the new avatar/banner shows on refresh
          // (without this, /api/auth/me serves the stale user for up to 5 min).
          if (mediaType === 'avatar' || mediaType === 'banner') {
            try {
              const { kvInvalidate } = await import('../../../../lib/cache');
              await kvInvalidate(`v1:user:${session.userId}`);
            } catch {}
          }
        } catch (e) {
          console.warn('[media/upload] DB profile update failed:', e.message);
        }
      }

      return NextResponse.json({
        publicId: result.public_id,
        url: result.secure_url,
      });
    }

    // Blog content images: track in media_uploads + update storage
    if (db) {
      try {
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
      } catch (e) {
        console.warn('[media/upload] DB tracking failed, returning URL anyway:', e.message);
      }
    }

    // Fallback: return Cloudinary URL even if DB tracking failed
    return NextResponse.json({
      publicId: result.public_id,
      url: result.secure_url,
    });
  } catch (e) {
    console.error('[media/upload] Unhandled error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}

// Remove a profile image → clears the DB pointer so it falls back to the default
// (avatar → initials, banner → blank, org logo → pixel avatar). Body: { type, orgId }.
export async function DELETE(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { type, orgId } = await request.json().catch(() => ({}));
  if (!PROFILE_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    if (type === 'org_avatar' || type === 'org_banner') {
      if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
      // Only org admins/maintainers (or the owner) may clear org media.
      const membership = await db.prepare('SELECT role FROM org_members WHERE org_id = ? AND user_id = ?')
        .bind(orgId, session.userId).first();
      const org = await db.prepare('SELECT owner_id FROM orgs WHERE id = ?').bind(orgId).first();
      if (org?.owner_id !== session.userId && membership?.role !== 'admin' && membership?.role !== 'maintain') {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
      if (type === 'org_avatar') {
        await db.prepare('UPDATE orgs SET logo_r2_key = NULL, logo_url = NULL WHERE id = ?').bind(orgId).run();
      } else {
        await db.prepare('UPDATE orgs SET banner_r2_key = NULL, banner_url = NULL WHERE id = ?').bind(orgId).run();
      }
    } else if (type === 'avatar') {
      await db.prepare('UPDATE users SET avatar_r2_key = NULL, avatar_url = NULL WHERE id = ?').bind(session.userId).run();
      try { const { kvInvalidate } = await import('../../../../lib/cache'); await kvInvalidate(`v1:user:${session.userId}`); } catch {}
    } else if (type === 'banner') {
      await db.prepare('UPDATE users SET banner_r2_key = NULL WHERE id = ?').bind(session.userId).run();
      try { const { kvInvalidate } = await import('../../../../lib/cache'); await kvInvalidate(`v1:user:${session.userId}`); } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[media/upload] DELETE failed:', e);
    return NextResponse.json({ error: 'Failed to remove image' }, { status: 500 });
  }
}
