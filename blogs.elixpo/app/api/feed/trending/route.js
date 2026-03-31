export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20);

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - 14 * 86400;

    const result = await db.prepare(`
      SELECT b.id, b.slug, b.title, b.subtitle, b.page_emoji,
        b.author_id, b.published_as, b.published_at, b.read_time_minutes,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count
      FROM blogs b
      WHERE b.status = 'published' AND b.published_at > ?
      ORDER BY like_count DESC, b.published_at DESC
      LIMIT ?
    `).bind(cutoff, limit).all();

    let posts = result?.results || [];

    // Enrich with author info
    if (posts.length > 0) {
      const authorIds = [...new Set(posts.map(p => p.author_id))];
      const placeholders = authorIds.map(() => '?').join(',');
      const authors = await db.prepare(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id IN (${placeholders})`
      ).bind(...authorIds).all();
      const authorMap = Object.fromEntries((authors?.results || []).map(a => [a.id, a]));
      posts = posts.map(p => ({ ...p, author: authorMap[p.author_id] || { username: 'unknown' } }));
    }

    return NextResponse.json({ posts });
  } catch (e) {
    console.error('Trending error:', e);
    return NextResponse.json({ posts: [] });
  }
}
