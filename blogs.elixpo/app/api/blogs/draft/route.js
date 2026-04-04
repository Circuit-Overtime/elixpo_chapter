export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

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
      'SELECT id, slug, title, subtitle, content, cover_image_r2_key, author_id, published_as, status, page_emoji, collection_id FROM blogs WHERE id = ?'
    ).bind(slugid).first();

    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

    // Check edit permission: author or org member with write+
    let canEdit = blog.author_id === session.userId;
    if (!canEdit && blog.published_as?.startsWith('org:')) {
      const orgId = blog.published_as.replace('org:', '');
      const member = await db.prepare(
        "SELECT role FROM org_members WHERE org_id = ? AND user_id = ? AND role IN ('admin','maintain','write')"
      ).bind(orgId, session.userId).first();
      canEdit = !!member;
    }

    if (!canEdit) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

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

    return NextResponse.json({
      blog: {
        ...blog,
        content,
        tags: (tags?.results || []).map(t => t.tag),
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

  const body = await request.json();
  const { slugid, title, subtitle, tags, publishAs, editorContent, pageEmoji } = body;

  if (!slugid) {
    return NextResponse.json({ error: 'Missing slugid' }, { status: 400 });
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
      // Check edit permission: author or org member with write+
      let canEdit = existing.author_id === session.userId;
      if (!canEdit) {
        const blog = await db.prepare('SELECT published_as FROM blogs WHERE id = ?').bind(slugid).first();
        if (blog?.published_as?.startsWith('org:')) {
          const orgId = blog.published_as.replace('org:', '');
          const member = await db.prepare(
            "SELECT role FROM org_members WHERE org_id = ? AND user_id = ? AND role IN ('admin','maintain','write')"
          ).bind(orgId, session.userId).first();
          canEdit = !!member;
        }
      }
      if (!canEdit) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      await db.prepare(`
        UPDATE blogs SET title = ?, subtitle = ?, content = ?, published_as = ?,
          page_emoji = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        title || '', subtitle || '', compressedContent, publishAs || 'personal',
        pageEmoji || '', now, slugid
      ).run();
    } else {
      const { ensureUniqueBlogSlug } = await import('../../../../lib/namespace');
      const baseSlug = generateSlug(title);
      const slug = await ensureUniqueBlogSlug(db, baseSlug, slugid);
      await db.prepare(`
        INSERT INTO blogs (id, slug, title, subtitle, content, author_id, published_as, status, page_emoji, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
      `).bind(
        slugid, slug, title || '', subtitle || '', compressedContent,
        session.userId, publishAs || 'personal', pageEmoji || '', now, now
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

    return NextResponse.json({ ok: true, slugid });
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
