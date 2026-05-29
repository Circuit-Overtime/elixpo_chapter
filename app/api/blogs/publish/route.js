export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { requestTooLarge, byteLength, MAX_BLOG_CONTENT_BYTES, MAX_TITLE_LEN, MAX_SUBTITLE_LEN } from '../../../../lib/limits';

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (requestTooLarge(request)) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  }

  const body = await request.json();
  const { slugid, title, subtitle, tags, publishAs, editorContent, pageEmoji, coverUrl, coverPos, coverZoom, status, lastKnownUpdatedAt, slug: requestedSlug } = body;
  const posX = Number.isFinite(coverPos?.x) ? coverPos.x : 50;
  const posY = Number.isFinite(coverPos?.y) ? coverPos.y : 50;
  const zoom = Number.isFinite(coverZoom) ? coverZoom : 1;

  // status: 'published' (feed), 'unlisted' (beta/public but no feed), 'draft'
  const targetStatus = status || 'published';
  if (!['published', 'unlisted', 'draft'].includes(targetStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (!slugid || !title?.trim()) {
    return NextResponse.json({ error: 'Missing slugid or title' }, { status: 400 });
  }

  if ((title?.length || 0) > MAX_TITLE_LEN || (subtitle?.length || 0) > MAX_SUBTITLE_LEN) {
    return NextResponse.json({ error: 'Title or subtitle too long' }, { status: 400 });
  }
  if (byteLength(editorContent) > MAX_BLOG_CONTENT_BYTES) {
    return NextResponse.json({ error: 'Content too large' }, { status: 413 });
  }
  // Require real content before going public (drafts may be short/empty).
  if (targetStatus !== 'draft' && countWords(editorContent) < 20) {
    return NextResponse.json({ error: 'A post needs at least 20 words before publishing.' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const { ensureUniqueBlogSlug } = await import('../../../../lib/namespace');
    const { compressBlogContent } = await import('../../../../lib/compress');
    const { checkPublishSafety } = await import('../../../../lib/blog-version');
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);
    const readTime = Math.max(1, Math.ceil(countWords(editorContent) / 250));
    const compressedContent = editorContent ? compressBlogContent(editorContent) : '';

    const existing = await db.prepare('SELECT id, author_id, status, published_as, slug FROM blogs WHERE id = ?').bind(slugid).first();

    // Slug rules:
    //  - Already-published blogs keep their slug (changing it would break the live URL).
    //  - Otherwise honour a user-provided slug if given, else derive from the title;
    //    ensureUniqueBlogSlug accepts it as-is when available or de-dupes it.
    let slug;
    if (existing && existing.status !== 'draft' && existing.slug) {
      slug = existing.slug;
    } else {
      const base = generateSlug((requestedSlug && requestedSlug.trim()) || title);
      // Slugs are unique per owner (the URL is /owner/slug), not globally.
      slug = await ensureUniqueBlogSlug(db, base, slugid, {
        authorId: session.userId,
        publishAs: publishAs || 'personal',
      });
    }

    if (existing) {
      // Permission: author, org write+, or accepted co-author.
      const { canEditBlog } = await import('../../../../lib/permissions');
      const perm = await canEditBlog(db, slugid, session.userId);
      if (!perm.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

      // Race condition check: ensure upstream hasn't changed since we loaded
      if (lastKnownUpdatedAt) {
        const safety = await checkPublishSafety(db, slugid, lastKnownUpdatedAt);
        if (!safety.safe) {
          return NextResponse.json({
            error: 'conflict',
            message: 'This blog was updated by someone else. Please sync before publishing.',
            currentVersion: safety.currentVersion,
          }, { status: 409 });
        }
      }

      const publishedAt = (targetStatus === 'published' || targetStatus === 'unlisted')
        ? (existing.status === 'draft' ? now : null)
        : null;

      let query = `
        UPDATE blogs SET title = ?, subtitle = ?, slug = ?, content = ?, published_as = ?,
          status = ?, page_emoji = ?, cover_image_r2_key = ?, cover_pos_x = ?, cover_pos_y = ?, cover_zoom = ?,
          read_time_minutes = ?, updated_at = ?
      `;
      const params = [title, subtitle || '', slug, compressedContent, publishAs || 'personal',
        targetStatus, pageEmoji || '', coverUrl || '', posX, posY, zoom, readTime, now];

      if (publishedAt) {
        query += ', published_at = ?';
        params.push(publishedAt);
      }
      query += ' WHERE id = ?';
      params.push(slugid);

      await db.prepare(query).bind(...params).run();
    } else {
      // Create and publish in one step
      await db.prepare(`
        INSERT INTO blogs (id, slug, title, subtitle, content, author_id, published_as, status,
          page_emoji, cover_image_r2_key, cover_pos_x, cover_pos_y, cover_zoom, read_time_minutes, created_at, updated_at, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        slugid, slug, title, subtitle || '', compressedContent,
        session.userId, publishAs || 'personal', targetStatus,
        pageEmoji || '', coverUrl || '', posX, posY, zoom, readTime, now, now,
        (targetStatus === 'published' || targetStatus === 'unlisted') ? now : null
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

    // Invalidate caches
    try {
      const { kvInvalidate } = await import('../../../../lib/cache');
      await kvInvalidate(
        `v1:tags:popular:30`, `v1:tags:popular:12`,
        `v1:trending:3`, `v1:trending:5`, `v1:trending:10`,
        `v1:feed:anon:trending:p1`,
        `v1:interactions:${slugid}`,
      );
    } catch {}

    return NextResponse.json({
      ok: true,
      slugid,
      slug,
      status: targetStatus,
      updatedAt: now,
      url: `/${session.profile?.username || 'user'}/${slug}`,
    });
  } catch (e) {
    console.error('Publish error:', e);
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 });
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

function countWords(blocks) {
  if (!blocks || !Array.isArray(blocks)) return 0;
  return blocks
    .map(b => (b.content && Array.isArray(b.content)) ? b.content.map(c => c.text || '').join('') : '')
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}
