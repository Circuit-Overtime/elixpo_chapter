export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'draft' | 'published' | 'unlisted' | null
  const filter = searchParams.get('filter'); // 'reshared' → blogs the user reposted
  const sort = searchParams.get('sort');      // 'views' | 'likes' | 'comments' | null (recent)
  const orderBy = sort === 'views' ? 'views DESC'
    : sort === 'likes' ? 'likes DESC'
    : sort === 'comments' ? 'comments DESC'
    : null;

  const COUNTS = `
    (SELECT COUNT(*) FROM blog_views WHERE blog_id = b.id) as views,
    (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes,
    (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comments`;

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    // Reshared = blogs THIS user reposted (authored by others).
    if (filter === 'reshared') {
      const rows = await db.prepare(`
        SELECT b.id, b.id as slugid, b.slug, b.title, b.subtitle, b.status,
          b.page_emoji, b.cover_image_r2_key, b.read_time_minutes,
          b.published_as, b.created_at, b.updated_at, b.published_at,
          u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar,
          r.created_at as reshared_at, ${COUNTS}
        FROM reposts r
        JOIN blogs b ON b.id = r.blog_id AND b.status = 'published'
        JOIN users u ON u.id = b.author_id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC LIMIT 50
      `).bind(session.userId).all();
      return NextResponse.json({ blogs: rows?.results || [] });
    }

    let query = `
      SELECT b.id, b.id as slugid, b.slug, b.title, b.subtitle, b.status,
        b.page_emoji, b.cover_image_r2_key, b.read_time_minutes,
        b.published_as, b.created_at, b.updated_at, b.published_at,
        EXISTS(SELECT 1 FROM reposts WHERE blog_id = b.id) as is_reshared,
        ${COUNTS}
      FROM blogs b
      WHERE b.author_id = ?
    `;
    const params = [session.userId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ` ORDER BY ${orderBy || 'b.updated_at DESC'} LIMIT 50`;

    const blogs = await db.prepare(query).bind(...params).all();

    return NextResponse.json({ blogs: blogs?.results || [] });
  } catch (e) {
    console.error('List blogs error:', e);
    return NextResponse.json({ blogs: [] });
  }
}
