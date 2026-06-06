export const runtime = 'edge';
import { NextResponse } from 'next/server';

// GET /api/library/public?username=&slug= — a public reading list + its blogs.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const slug = searchParams.get('slug');
  if (!username || !slug) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const owner = await db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE LOWER(username) = LOWER(?)').bind(username).first();
    if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const list = await db.prepare(
      'SELECT id, name, description FROM bookmark_collections WHERE user_id = ? AND slug = ? AND is_public = 1'
    ).bind(owner.id, slug).first();
    if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rows = await db.prepare(`
      SELECT b.id, b.slug, b.title, b.subtitle, b.excerpt, b.cover_image_r2_key, b.published_as,
        b.read_time_minutes, b.published_at, b.author_id,
        u.username AS author_username, u.display_name AS author_name, u.avatar_url AS author_avatar,
        bk.created_at AS saved_at
      FROM bookmarks bk
      JOIN blogs b ON b.id = bk.blog_id AND b.status = 'published'
      JOIN users u ON u.id = b.author_id
      WHERE bk.user_id = ? AND bk.collection_id = ?
      ORDER BY bk.created_at DESC
    `).bind(owner.id, list.id).all();

    return NextResponse.json({
      owner: { username: owner.username, display_name: owner.display_name, avatar_url: owner.avatar_url },
      list: { name: list.name, description: list.description },
      blogs: rows?.results || [],
    });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
