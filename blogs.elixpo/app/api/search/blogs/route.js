export const runtime = 'edge';
import { NextResponse } from 'next/server';

// Granular blog search with selectable fields
// ?q=query&fields=slugid,slug,title,author,tags,views,likes,comments
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const fields = (searchParams.get('fields') || 'slugid,slug,title').split(',').map(f => f.trim());
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
  const status = searchParams.get('status') || 'published,unlisted';

  if (!q || q.length < 2) {
    return NextResponse.json({ blogs: [] });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const pattern = `%${q}%`;
    const statuses = status.split(',').map(s => s.trim());
    const placeholders = statuses.map(() => '?').join(',');

    const base = await db.prepare(`
      SELECT b.id as slugid, b.slug, b.title, b.subtitle, b.page_emoji,
        b.read_time_minutes, b.published_at, b.author_id, b.status,
        u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
      FROM blogs b
      JOIN users u ON u.id = b.author_id
      WHERE (LOWER(b.title) LIKE ? OR LOWER(b.slug) LIKE ?) AND b.status IN (${placeholders})
      LIMIT ?
    `).bind(pattern, pattern, ...statuses, limit).all();

    const blogs = base?.results || [];

    // Enrich with optional counts
    if (blogs.length > 0) {
      for (const b of blogs) {
        if (fields.includes('views')) {
          const vc = await db.prepare('SELECT COUNT(*) as c FROM blog_views WHERE blog_id = ?').bind(b.slugid).first();
          b.views = vc?.c || 0;
        }
        if (fields.includes('likes')) {
          const lc = await db.prepare('SELECT COUNT(*) as c FROM likes WHERE blog_id = ?').bind(b.slugid).first();
          b.likes = lc?.c || 0;
        }
        if (fields.includes('comments')) {
          const cc = await db.prepare('SELECT COUNT(*) as c FROM comments WHERE blog_id = ?').bind(b.slugid).first();
          b.comments = cc?.c || 0;
        }
        if (fields.includes('tags')) {
          const tags = await db.prepare('SELECT tag FROM blog_tags WHERE blog_id = ?').bind(b.slugid).all();
          b.tags = (tags?.results || []).map(t => t.tag);
        }
      }
    }

    return NextResponse.json({ blogs });
  } catch {
    return NextResponse.json({ blogs: [] });
  }
}
