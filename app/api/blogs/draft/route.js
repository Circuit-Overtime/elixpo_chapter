export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { requestTooLarge, byteLength, MAX_BLOG_CONTENT_BYTES } from '../../../../lib/limits';

// GET — fetch blog data for editing
export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slugid = searchParams.get('slugid');
  if (!slugid) return NextResponse.json({ error: 'Missing slugid' }, { status: 400 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const { decompressBlogContent } = await import('../../../../lib/compress');
    const db = getDB();

    const blog = await db.prepare(
      'SELECT id, slug, title, subtitle, content, cover_image_r2_key, cover_pos_x, cover_pos_y, cover_zoom, author_id, published_as, status, page_emoji, collection_id FROM blogs WHERE id = ?'
    ).bind(slugid).first();

    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

    // Edit permission: author, org write+, or accepted co-author.
    const { canEditBlog } = await import('../../../../lib/permissions');
    const perm = await canEditBlog(db, slugid, session.userId);
    if (!perm.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    // Decompress content
    let content = blog.content;
    try { content = decompressBlogContent(content); } catch {
      try { content = JSON.parse(content); } catch {}
    }

    // Get tags
    const tags = await db.prepare('SELECT tag FROM blog_tags WHERE blog_id = ?').bind(slugid).all();

    // Get version info
    const { getBlogVersionInfo } = await import('../../../../lib/blog-version');
    const version = await getBlogVersionInfo(db, slugid);

    // Owner = personal author or org admin/owner. Only the owner may change the slug.
    let isOwner = blog.author_id === session.userId;
    if (!isOwner && blog.published_as?.startsWith('org:')) {
      const orgId = blog.published_as.slice(4);
      const adminRow = await db
        .prepare("SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ? AND role = 'admin'")
        .bind(orgId, session.userId).first();
      const ownerRow = adminRow || await db
        .prepare('SELECT 1 FROM orgs WHERE id = ? AND owner_id = ?')
        .bind(orgId, session.userId).first();
      isOwner = !!ownerRow;
    }

    return NextResponse.json({
      blog: {
        ...blog,
        content,
        tags: (tags?.results || []).map(t => t.tag),
        is_owner: isOwner,
      },
      version,
    });
  } catch (e) {
    console.error('Draft fetch error:', e);
    return NextResponse.json({ error: 'Failed to load blog' }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (requestTooLarge(request)) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  const body = await request.json();
  const { slugid, title, subtitle, tags, publishAs, editorContent, pageEmoji, coverPreview, coverPos, coverZoom } = body;
  const posX = Number.isFinite(coverPos?.x) ? coverPos.x : 50;
  const posY = Number.isFinite(coverPos?.y) ? coverPos.y : 50;
  const zoom = Number.isFinite(coverZoom) ? coverZoom : 1;

  if (!slugid) {
    return NextResponse.json({ error: 'Missing slugid' }, { status: 400 });
  }
  if (byteLength(editorContent) > MAX_BLOG_CONTENT_BYTES) {
    return NextResponse.json({ error: 'Content too large' }, { status: 413 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const { compressBlogContent } = await import('../../../../lib/compress');
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);

    // Compress content before storing
    const compressedContent = editorContent ? compressBlogContent(editorContent) : '';

    // Check if blog exists
    const existing = await db.prepare('SELECT id, author_id FROM blogs WHERE id = ?').bind(slugid).first();

    if (existing) {
      // Edit permission: author, org write+, or accepted co-author.
      const { canEditBlog } = await import('../../../../lib/permissions');
      const perm = await canEditBlog(db, slugid, session.userId);
      if (!perm.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      await db.prepare(`
        UPDATE blogs SET title = ?, subtitle = ?, content = ?, published_as = ?,
          page_emoji = ?, cover_image_r2_key = ?, cover_pos_x = ?, cover_pos_y = ?, cover_zoom = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        title || '', subtitle || '', compressedContent, publishAs || 'personal',
        pageEmoji || '', coverPreview || '', posX, posY, zoom, now, slugid
      ).run();
    } else {
      const { ensureUniqueBlogSlug } = await import('../../../../lib/namespace');
      const baseSlug = generateSlug(title);
      const slug = await ensureUniqueBlogSlug(db, baseSlug, slugid, {
        authorId: session.userId,
        publishAs: publishAs || 'personal',
      });
      await db.prepare(`
        INSERT INTO blogs (id, slug, title, subtitle, content, author_id, published_as, status, page_emoji, cover_image_r2_key, cover_pos_x, cover_pos_y, cover_zoom, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        slugid, slug, title || '', subtitle || '', compressedContent,
        session.userId, publishAs || 'personal', pageEmoji || '', coverPreview || '', posX, posY, zoom, now, now
      ).run();
    }

    // Sync tags
    if (tags && Array.isArray(tags)) {
      await db.prepare('DELETE FROM blog_tags WHERE blog_id = ?').bind(slugid).run();
      for (const tag of tags.slice(0, 5)) {
        await db.prepare('INSERT OR IGNORE INTO blog_tags (blog_id, tag) VALUES (?, ?)')
          .bind(slugid, tag).run();
      }
    }

    // Return the new updated_at so the client can keep lastKnownUpdatedAt in
    // sync — otherwise the author's own background sync looks like a conflict.
    return NextResponse.json({ ok: true, slugid, updatedAt: now });
  } catch (e) {
    console.error('Draft save error:', e);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

function generateSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '');
}
