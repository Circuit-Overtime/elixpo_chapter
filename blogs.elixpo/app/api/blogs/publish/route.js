export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { slugid, title, subtitle, tags, publishAs, editorContent, pageEmoji, coverUrl, status, lastKnownUpdatedAt } = body;

  // status: 'published' (feed), 'unlisted' (beta/public but no feed), 'draft'
  const targetStatus = status || 'published';
  if (!['published', 'unlisted', 'draft'].includes(targetStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (!slugid || !title?.trim()) {
    return NextResponse.json({ error: 'Missing slugid or title' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const { ensureUniqueBlogSlug } = await import('../../../../lib/namespace');
    const { compressBlogContent } = await import('../../../../lib/compress');
    const { checkPublishSafety } = await import('../../../../lib/blog-version');
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueBlogSlug(db, baseSlug, slugid);
    const readTime = Math.max(1, Math.ceil(countWords(editorContent) / 250));
    const compressedContent = editorContent ? compressBlogContent(editorContent) : '';

    const existing = await db.prepare('SELECT id, author_id, status, published_as FROM blogs WHERE id = ?').bind(slugid).first();

    if (existing) {
      // Permission check: author or org member with write+
      let canEdit = existing.author_id === session.userId;
      if (!canEdit && existing.published_as?.startsWith('org:')) {
        const orgId = existing.published_as.replace('org:', '');
        const member = await db.prepare(
          "SELECT role FROM org_members WHERE org_id = ? AND user_id = ? AND role IN ('admin','maintain','write')"
        ).bind(orgId, session.userId).first();
        canEdit = !!member;
      }
      if (!canEdit) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

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
          status = ?, page_emoji = ?, cover_image_r2_key = ?, read_time_minutes = ?, updated_at = ?
      `;
      const params = [title, subtitle || '', slug, compressedContent, publishAs || 'personal',
        targetStatus, pageEmoji || '', coverUrl || '', readTime, now];

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
          page_emoji, cover_image_r2_key, read_time_minutes, created_at, updated_at, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        slugid, slug, title, subtitle || '', compressedContent,
        session.userId, publishAs || 'personal', targetStatus,
        pageEmoji || '', coverUrl || '', readTime, now, now,
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
