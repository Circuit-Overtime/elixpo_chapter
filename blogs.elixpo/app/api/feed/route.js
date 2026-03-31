export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';

const BLOG_FIELDS = `b.id, b.slug, b.title, b.subtitle, b.cover_image_r2_key, b.page_emoji,
  b.author_id, b.published_as, b.published_at, b.read_time_minutes`;

/**
 * GET /api/feed — personalized feed
 *
 * Query params:
 *   ?page=1&limit=20
 *   ?filter=following  — only followed users/orgs
 *   ?tag=AI            — filter by specific tag
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 40);
  const filterType = searchParams.get('filter') || '';
  const filterTag = searchParams.get('tag') || '';
  const offset = (page - 1) * limit;

  const session = await getSession().catch(() => null);
  const userId = session?.userId;

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);

    let posts;

    if (filterType === 'following' && userId) {
      // Following-only feed
      posts = await queryFollowing(db, userId, now, limit, offset);
    } else if (filterTag) {
      // Tag-filtered feed
      posts = await queryByTag(db, filterTag, now, limit, offset);
    } else if (userId) {
      // Blended personalized feed
      posts = await queryBlended(db, userId, now, limit);
    } else {
      // Anonymous — trending/recent
      posts = await queryTrending(db, now, limit, offset);
    }

    // Enrich with author info and tags
    if (posts.length > 0) {
      const authorIds = [...new Set(posts.map(p => p.author_id))];
      const blogIds = posts.map(p => p.id);

      const [authors, tags] = await Promise.all([
        batchQuery(db, 'SELECT id, username, display_name, avatar_url FROM users WHERE id IN', authorIds),
        batchQuery(db, 'SELECT blog_id, tag FROM blog_tags WHERE blog_id IN', blogIds),
      ]);

      const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));
      const tagMap = {};
      for (const t of tags) {
        if (!tagMap[t.blog_id]) tagMap[t.blog_id] = [];
        tagMap[t.blog_id].push(t.tag);
      }

      posts = posts.map(p => ({
        ...p,
        author: authorMap[p.author_id] || { username: 'unknown', display_name: 'Unknown' },
        tags: tagMap[p.id] || [],
      }));
    }

    return NextResponse.json({
      posts,
      page,
      hasMore: posts.length === limit,
    });
  } catch (e) {
    console.error('Feed error:', e?.message || e);
    return NextResponse.json({ posts: [], page, hasMore: false });
  }
}

// ─── Bucket A: Following ─────────────────────────────────────────────
async function queryFollowing(db, userId, now, limit, offset) {
  const cutoff = now - 30 * 86400;
  const result = await db.prepare(`
    SELECT ${BLOG_FIELDS},
      (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comment_count
    FROM blogs b
    WHERE b.status = 'published' AND b.published_at > ?
      AND (
        b.author_id IN (SELECT following_id FROM follows WHERE follower_id = ? AND following_type = 'user')
        OR b.published_as IN (
          SELECT 'org:' || following_id FROM follows WHERE follower_id = ? AND following_type = 'org'
        )
      )
    ORDER BY b.published_at DESC
    LIMIT ? OFFSET ?
  `).bind(cutoff, userId, userId, limit, offset).all();
  return result?.results || [];
}

// ─── Bucket B: Interest-matched ──────────────────────────────────────
async function queryInterests(db, userId, now, limit) {
  const cutoff = now - 14 * 86400;
  const result = await db.prepare(`
    SELECT ${BLOG_FIELDS},
      (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comment_count
    FROM blogs b
    WHERE b.status = 'published' AND b.published_at > ?
      AND b.id IN (
        SELECT blog_id FROM blog_tags WHERE tag IN (
          SELECT tag FROM user_interests WHERE user_id = ?
        )
      )
      AND b.author_id != ?
    ORDER BY b.published_at DESC
    LIMIT ?
  `).bind(cutoff, userId, userId, limit).all();
  return result?.results || [];
}

// ─── Bucket C: Trending ──────────────────────────────────────────────
async function queryTrending(db, now, limit, offset) {
  const cutoff = now - 14 * 86400;
  const viewCutoff = now - 3 * 86400;
  const result = await db.prepare(`
    SELECT ${BLOG_FIELDS},
      (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comment_count,
      (SELECT COUNT(*) FROM blog_views WHERE blog_id = b.id AND created_at > ?) as recent_views
    FROM blogs b
    WHERE b.status = 'published' AND b.published_at > ?
    ORDER BY like_count DESC, recent_views DESC, b.published_at DESC
    LIMIT ? OFFSET ?
  `).bind(viewCutoff, cutoff, limit, offset).all();
  return result?.results || [];
}

// ─── Tag-filtered ────────────────────────────────────────────────────
async function queryByTag(db, tag, now, limit, offset) {
  const cutoff = now - 30 * 86400;
  const result = await db.prepare(`
    SELECT ${BLOG_FIELDS},
      (SELECT COUNT(*) FROM likes WHERE blog_id = b.id) as like_count,
      (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comment_count
    FROM blogs b
    WHERE b.status = 'published' AND b.published_at > ?
      AND b.id IN (SELECT blog_id FROM blog_tags WHERE LOWER(tag) = LOWER(?))
    ORDER BY b.published_at DESC
    LIMIT ? OFFSET ?
  `).bind(cutoff, tag, limit, offset).all();
  return result?.results || [];
}

// ─── Blended feed (3 buckets merged in JS) ───────────────────────────
async function queryBlended(db, userId, now, limit) {
  const [following, interests, trending] = await Promise.all([
    queryFollowing(db, userId, now, 15, 0),
    queryInterests(db, userId, now, 15),
    queryTrending(db, now, 20, 0),
  ]);

  // Deduplicate by ID
  const seen = new Set();
  const all = [];
  for (const post of [...following, ...interests, ...trending]) {
    if (!seen.has(post.id)) {
      seen.add(post.id);

      // Score
      const isFollowed = following.some(p => p.id === post.id);
      const isInterest = interests.some(p => p.id === post.id);
      const hoursSince = Math.max(0, (now - post.published_at) / 3600);
      const recency = Math.max(0, 20 - hoursSince / 12);
      const engagement = Math.min(20, (post.like_count || 0) * 0.5 + (post.comment_count || 0) * 1.5 + (post.recent_views || 0) * 0.1);

      post._score = (isFollowed ? 50 : 0) + (isInterest ? 30 : 0) + engagement + recency;
      all.push(post);
    }
  }

  // Sort by score descending
  all.sort((a, b) => b._score - a._score);

  // Clean up internal score field
  return all.slice(0, limit).map(({ _score, ...rest }) => rest);
}

// ─── Batch query helper ──────────────────────────────────────────────
async function batchQuery(db, queryPrefix, ids) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = await db.prepare(`${queryPrefix} (${placeholders})`).bind(...ids).all();
  return result?.results || [];
}
