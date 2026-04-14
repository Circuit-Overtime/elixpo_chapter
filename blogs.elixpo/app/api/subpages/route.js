export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';

// POST — create a new subpage
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { blogId, title } = body;
  if (!blogId) return NextResponse.json({ error: 'Missing blogId' }, { status: 400 });

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();

    // Ensure subpages table exists (auto-create if missing)
    await db.prepare(`CREATE TABLE IF NOT EXISTS subpages (
      id TEXT PRIMARY KEY,
      blog_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`).run();

    // Verify blog ownership
    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(blogId).first();
    if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    if (blog.author_id !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const now = Date.now();

    await db.prepare(
      'INSERT INTO subpages (id, blog_id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, blogId, title || 'Untitled', '[]', now, now).run();

    return NextResponse.json({ id, blogId, title: title || 'Untitled' });
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
      try { subpage.content = decompressBlogContent(subpage.content); } catch {
        try { subpage.content = JSON.parse(subpage.content); } catch {}
      }
      return NextResponse.json(subpage);
    }

    if (!blogId) return NextResponse.json({ error: 'Missing blogId or id' }, { status: 400 });

    const { results } = await db.prepare(
      'SELECT id, blog_id, title, created_at, updated_at FROM subpages WHERE blog_id = ? ORDER BY created_at ASC'
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

  const body = await request.json();
  const { id, title, content } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const { compressBlogContent } = await import('../../../lib/compress');
    const db = getDB();

    const subpage = await db.prepare('SELECT blog_id FROM subpages WHERE id = ?').bind(id).first();
    if (!subpage) return NextResponse.json({ error: 'Subpage not found' }, { status: 404 });

    // Verify blog ownership
    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(subpage.blog_id).first();
    if (!blog || blog.author_id !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = Date.now();
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (content !== undefined) {
      const compressed = typeof content === 'string' ? content : compressBlogContent(content);
      updates.push('content = ?');
      values.push(compressed);
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
