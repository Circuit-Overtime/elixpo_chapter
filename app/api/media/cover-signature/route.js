export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { createCloudinaryUploadSignature } from '../../../../lib/cloudinary';

const BLOG_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_COVER_BYTES = 2 * 1024 * 1024;

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { blogId, size, mime } = await request.json();
    if (!BLOG_ID_PATTERN.test(blogId || '')) {
      return NextResponse.json({ error: 'Invalid blogId' }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_COVER_BYTES) {
      return NextResponse.json({ error: 'Cover image is too large' }, { status: 413 });
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      return NextResponse.json({ error: 'Unsupported cover image type' }, { status: 415 });
    }

    // Existing blogs require edit permission. New editor URLs receive their id
    // before the draft row exists, matching the existing upload route's staging
    // behaviour.
    try {
      const { getDB } = await import('../../../../lib/cloudflare');
      const db = getDB();
      const blog = await db.prepare('SELECT id FROM blogs WHERE id = ?').bind(blogId).first();
      if (blog) {
        const { canEditBlog } = await import('../../../../lib/permissions');
        const permission = await canEditBlog(db, blogId, session.userId);
        if (!permission.ok) {
          return NextResponse.json({ error: 'Not authorized to upload this cover' }, { status: 403 });
        }
      }
    } catch (error) {
      console.warn('[media/cover-signature] D1 permission check unavailable:', error.message);
    }

    const folder = `lixblogs/${blogId}`;
    const publicId = 'cover';
    const signed = await createCloudinaryUploadSignature({
      folder,
      publicId,
      overwrite: true,
    });

    return NextResponse.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
      apiKey: signed.apiKey,
      timestamp: signed.timestamp,
      signature: signed.signature,
      folder,
      publicId,
      overwrite: true,
      invalidate: true,
    });
  } catch (error) {
    console.error('[media/cover-signature] Failed:', error);
    return NextResponse.json(
      { error: error.message || 'Could not prepare cover upload' },
      { status: 500 }
    );
  }
}
