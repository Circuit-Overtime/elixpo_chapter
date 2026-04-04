export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const uid = session.userId;

    // Run all queries in parallel
    const [
      publishedCount,
      draftCount,
      totalViews,
      totalReads,
      totalLikes,
      totalComments,
      followerCount,
      followingCount,
      monthlyViews,
      monthlyReads,
      topPosts,
    ] = await Promise.all([
      // Published blog count
      db.prepare('SELECT COUNT(*) as c FROM blogs WHERE author_id = ? AND status = ?')
        .bind(uid, 'published').first(),
      // Draft count
      db.prepare('SELECT COUNT(*) as c FROM blogs WHERE author_id = ? AND status = ?')
        .bind(uid, 'draft').first(),
      // Total views across all blogs
      db.prepare(`
        SELECT COUNT(*) as c FROM blog_views bv
        JOIN blogs b ON b.id = bv.blog_id
        WHERE b.author_id = ?
      `).bind(uid).first(),
      // Total reads (from read_history with progress > 0.5)
      db.prepare(`
        SELECT COUNT(*) as c FROM read_history rh
        JOIN blogs b ON b.id = rh.blog_id
        WHERE b.author_id = ? AND rh.read_progress > 0.5
      `).bind(uid).first(),
      // Total likes
      db.prepare(`
        SELECT COUNT(*) as c FROM likes l
        JOIN blogs b ON b.id = l.blog_id
        WHERE b.author_id = ?
      `).bind(uid).first(),
      // Total comments
      db.prepare(`
        SELECT COUNT(*) as c FROM comments cm
        JOIN blogs b ON b.id = cm.blog_id
        WHERE b.author_id = ?
      `).bind(uid).first(),
      // Followers
      db.prepare(`SELECT COUNT(*) as c FROM follows WHERE following_id = ? AND following_type = 'user'`)
        .bind(uid).first(),
      // Following
      db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?')
        .bind(uid).first(),
      // Monthly views (last 12 months)
      db.prepare(`
        SELECT
          strftime('%Y-%m', datetime(bv.created_at, 'unixepoch')) as month,
          COUNT(*) as views
        FROM blog_views bv
        JOIN blogs b ON b.id = bv.blog_id
        WHERE b.author_id = ? AND bv.created_at > unixepoch() - 31536000
        GROUP BY month ORDER BY month
      `).bind(uid).all(),
      // Monthly reads (last 12 months)
      db.prepare(`
        SELECT
          strftime('%Y-%m', datetime(rh.read_at, 'unixepoch')) as month,
          COUNT(*) as reads
        FROM read_history rh
        JOIN blogs b ON b.id = rh.blog_id
        WHERE b.author_id = ? AND rh.read_progress > 0.5 AND rh.read_at > unixepoch() - 31536000
        GROUP BY month ORDER BY month
      `).bind(uid).all(),
      // Top posts by views
      db.prepare(`
        SELECT b.id, b.title, b.slug, b.published_at,
          (SELECT COUNT(*) FROM blog_views WHERE blog_id = b.id) as views,
          (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as likes,
          (SELECT COUNT(*) FROM read_history WHERE blog_id = b.id AND read_progress > 0.5) as reads
        FROM blogs b
        WHERE b.author_id = ? AND b.status = 'published'
        ORDER BY views DESC
        LIMIT 10
      `).bind(uid).all(),
    ]);

    // Build monthly data arrays (last 12 months)
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7)); // "YYYY-MM"
    }

    const viewsByMonth = Object.fromEntries((monthlyViews?.results || []).map(r => [r.month, r.views]));
    const readsByMonth = Object.fromEntries((monthlyReads?.results || []).map(r => [r.month, r.reads]));

    return NextResponse.json({
      published: publishedCount?.c || 0,
      drafts: draftCount?.c || 0,
      views: totalViews?.c || 0,
      reads: totalReads?.c || 0,
      likes: totalLikes?.c || 0,
      comments: totalComments?.c || 0,
      followers: followerCount?.c || 0,
      following: followingCount?.c || 0,
      monthly: {
        labels: months,
        views: months.map(m => viewsByMonth[m] || 0),
        reads: months.map(m => readsByMonth[m] || 0),
      },
      topPosts: (topPosts?.results || []).map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        publishedAt: p.published_at,
        views: p.views,
        likes: p.likes,
        reads: p.reads,
      })),
    });
  } catch (e) {
    // D1 not available — return zeros
    return NextResponse.json({
      published: 0, drafts: 0, views: 0, reads: 0, likes: 0, comments: 0,
      followers: 0, following: 0,
      monthly: { labels: [], views: [], reads: [] },
      topPosts: [],
    });
  }
}
