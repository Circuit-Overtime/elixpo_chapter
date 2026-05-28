export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { requestTooLarge, byteLength, MAX_SUBPAGE_CONTENT_BYTES, MAX_SUBPAGES_PER_BLOG, MAX_CANVAS_PER_BLOG } from '../../../lib/limits';

// POST — create a new subpage
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { blogId, title, kind, metadata } = body;
  if (!blogId) return NextResponse.json({ error: 'Missing blogId' }, { status: 400 });

  const subpageKind = kind === 'canvas' ? 'canvas' : 'doc';

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();

    // Verify blog ownership
    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(blogId).first();
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    if (blog.author_id !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Cap sub-pages per kind: max 2 doc sub-pages and max 2 canvas sub-pages per blog.
    // (Nesting is structurally impossible — a sub-page's id is never a blogs row,
    //  so creating a sub-page "under" a sub-page 404s on the ownership check above.)
    const kindCap = subpageKind === 'canvas' ? MAX_CANVAS_PER_BLOG : MAX_SUBPAGES_PER_BLOG;
    const kindCount = await db.prepare(
      'SELECT COUNT(*) as n FROM subpages WHERE blog_id = ? AND kind = ?'
    ).bind(blogId, subpageKind).first();
    if ((kindCount?.n ?? 0) >= kindCap) {
      const label = subpageKind === 'canvas' ? 'Canvas' : 'Sub-page';
      return NextResponse.json({ error: `${label} limit reached (max ${kindCap} per blog)` }, { status: 409 });
    }

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const now = Date.now();
    const initialContent = subpageKind === 'canvas' ? '' : '[]';
    const metaStr = metadata ? JSON.stringify(metadata) : null;

    await db.prepare(
      'INSERT INTO subpages (id, blog_id, title, content, created_at, updated_at, kind, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, blogId, title || 'Untitled', initialContent, now, now, subpageKind, metaStr).run();

    return NextResponse.json({ id, blogId, title: title || 'Untitled', kind: subpageKind });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — list subpages for a blog, or fetch a single subpage by id
export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const blogId = searchParams.get('blogId');
  const subpageId = searchParams.get('id');

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const { decompressBlogContent } = await import('../../../lib/compress');
    const db = getDB();

    if (subpageId) {
      const subpage = await db.prepare('SELECT * FROM subpages WHERE id = ?').bind(subpageId).first();
      if (!subpage) return NextResponse.json({ error: 'Subpage not found' }, { status: 404 });

      // Access control: published parent → any signed-in user may read;
      // draft/archived → only users who can edit the parent blog.
      const parent = await db.prepare('SELECT status FROM blogs WHERE id = ?').bind(subpage.blog_id).first();
      const isPublic = parent && (parent.status === 'published' || parent.status === 'unlisted');
      if (!isPublic) {
        const { canEditBlog } = await import('../../../lib/permissions');
        const perm = await canEditBlog(db, subpage.blog_id, session.userId);
        if (!perm.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Canvas scenes are stored as plain JSON strings (no gzip), docs are gzip-compressed.
      if (subpage.kind === 'canvas') {
        try { subpage.content = subpage.content ? JSON.parse(subpage.content) : null; } catch {}
      } else {
        try { subpage.content = decompressBlogContent(subpage.content); } catch {
          try { subpage.content = JSON.parse(subpage.content); } catch {}
        }
      }
      if (subpage.metadata) {
        try { subpage.metadata = JSON.parse(subpage.metadata); } catch {}
      }
      return NextResponse.json(subpage);
    }

    if (!blogId) return NextResponse.json({ error: 'Missing blogId or id' }, { status: 400 });

    const { results } = await db.prepare(
      'SELECT id, blog_id, title, kind, created_at, updated_at FROM subpages WHERE blog_id = ? ORDER BY created_at ASC'
    ).bind(blogId).all();

    return NextResponse.json({ subpages: results || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — update subpage content or title
export async function PUT(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (requestTooLarge(request)) return NextResponse.json({ error: 'Request too large' }, { status: 413 });

  const body = await request.json();
  const { id, title, content, metadata } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  if (byteLength(content) > MAX_SUBPAGE_CONTENT_BYTES) {
    return NextResponse.json({ error: 'Content too large' }, { status: 413 });
  }

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const { compressBlogContent } = await import('../../../lib/compress');
    const db = getDB();

    const subpage = await db.prepare('SELECT blog_id, kind FROM subpages WHERE id = ?').bind(id).first();
    if (!subpage) return NextResponse.json({ error: 'Subpage not found' }, { status: 404 });

    // Verify blog ownership
    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(subpage.blog_id).first();
    if (!blog || blog.author_id !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = Date.now();
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (content !== undefined) {
      // Canvas: store scene JSON as plain text. Doc: gzip-compress like blogs.
      let serialized;
      if (subpage.kind === 'canvas') {
        serialized = typeof content === 'string' ? content : JSON.stringify(content);
      } else {
        serialized = typeof content === 'string' ? content : compressBlogContent(content);
      }
      updates.push('content = ?');
      values.push(serialized);
    }
    if (metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(metadata === null ? null : JSON.stringify(metadata));
    }
    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.prepare(`UPDATE subpages SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a subpage
export async function DELETE(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();

    const subpage = await db.prepare('SELECT blog_id FROM subpages WHERE id = ?').bind(id).first();
    if (!subpage) return NextResponse.json({ error: 'Subpage not found' }, { status: 404 });

    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(subpage.blog_id).first();
    if (!blog || blog.author_id !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.prepare('DELETE FROM subpages WHERE id = ?').bind(id).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
