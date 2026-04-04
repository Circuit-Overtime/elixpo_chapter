export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'draft', 'published', 'unlisted', or null for all

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    let query = `
      SELECT b.id, b.id as slugid, b.slug, b.title, b.subtitle, b.status,
        b.page_emoji, b.cover_image_r2_key, b.read_time_minutes,
        b.published_as, b.created_at, b.updated_at, b.published_at,
        (SELECT COUNT(*) FROM blog_views WHERE blog_id = b.id) as views,
        (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes,
        (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comments
      FROM blogs b
      WHERE b.author_id = ?
    `;
    const params = [session.userId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.updated_at DESC LIMIT 50';

    const blogs = await db.prepare(query).bind(...params).all();

    return NextResponse.json({ blogs: blogs?.results || [] });
  } catch (e) {
    console.error('List blogs error:', e);
    return NextResponse.json({ blogs: [] });
  }
}
