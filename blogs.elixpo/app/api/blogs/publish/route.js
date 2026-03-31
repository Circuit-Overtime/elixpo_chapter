export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { slugid, title, subtitle, tags, publishAs, editorContent, pageEmoji, coverUrl, status } = body;

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
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueBlogSlug(db, baseSlug, slugid);
    const readTime = Math.max(1, Math.ceil(countWords(editorContent) / 250));
    const compressedContent = editorContent ? compressBlogContent(editorContent) : '';

    const existing = await db.prepare('SELECT id, author_id, status FROM blogs WHERE id = ?').bind(slugid).first();

    if (existing) {
      if (existing.author_id !== session.userId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
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
