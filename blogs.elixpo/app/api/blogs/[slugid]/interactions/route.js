export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

// GET — all interaction state for a blog in one call
export async function GET(request, { params }) {
  const { slugid } = await params;
  const session = await getSession().catch(() => null);
  const userId = session?.userId;

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    const queries = [
      db.prepare('SELECT COUNT(*) as c FROM likes WHERE blog_id = ?').bind(slugid).first(),
      db.prepare('SELECT COALESCE(SUM(count), 0) as c FROM claps WHERE blog_id = ?').bind(slugid).first(),
      db.prepare('SELECT COUNT(*) as c FROM comments WHERE blog_id = ?').bind(slugid).first(),
      db.prepare('SELECT COUNT(*) as c FROM blog_views WHERE blog_id = ?').bind(slugid).first(),
    ];

    if (userId) {
      queries.push(
        db.prepare('SELECT 1 FROM likes WHERE blog_id = ? AND user_id = ?').bind(slugid, userId).first(),
        db.prepare('SELECT count FROM claps WHERE blog_id = ? AND user_id = ?').bind(slugid, userId).first(),
        db.prepare('SELECT collection_id FROM bookmarks WHERE blog_id = ? AND user_id = ?').bind(slugid, userId).first(),
        db.prepare('SELECT read_progress FROM read_history WHERE blog_id = ? AND user_id = ?').bind(slugid, userId).first(),
      );
    }

    const results = await Promise.all(queries);

    return NextResponse.json({
      likeCount: results[0]?.c || 0,
      totalClaps: results[1]?.c || 0,
      commentCount: results[2]?.c || 0,
      viewCount: results[3]?.c || 0,
      liked: userId ? !!results[4] : false,
      userClaps: userId ? (results[5]?.count || 0) : 0,
      bookmarked: userId ? !!results[6] : false,
      bookmarkCollectionId: userId ? (results[6]?.collection_id || null) : null,
      readProgress: userId ? (results[7]?.read_progress || 0) : 0,
    });
  } catch {
    return NextResponse.json({ likeCount: 0, totalClaps: 0, commentCount: 0, viewCount: 0, liked: false, userClaps: 0, bookmarked: false, readProgress: 0 });
  }
}
