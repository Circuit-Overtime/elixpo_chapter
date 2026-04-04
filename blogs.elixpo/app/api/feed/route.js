export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { STAFF_ORG_ID } from '../../../lib/staff';

const BLOG_FIELDS = `b.id, b.slug, b.title, b.subtitle, b.cover_image_r2_key, b.page_emoji,
  b.author_id, b.published_as, b.published_at, b.read_time_minutes,
  b.like_count, b.clap_total, b.comment_count, b.view_count`;

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
    // Cache anonymous feeds (shared across all anonymous users)
    if (!userId) {
      const { kvCache } = await import('../../../lib/cache');
      const cacheKey = filterTag
        ? `v1:feed:anon:tag:${filterTag}:p${page}`
        : `v1:feed:anon:trending:p${page}`;

      const cached = await kvCache(cacheKey, 180, async () => {
        const { getDB } = await import('../../../lib/cloudflare');
        const db = getDB();
        const now = Math.floor(Date.now() / 1000);
        let posts = filterTag
          ? await queryByTag(db, filterTag, now, limit, offset)
          : await queryTrending(db, now, limit, offset);
        posts = await enrichPosts(db, posts, null);
        return { posts, page, hasMore: posts.length === limit };
      });
      return NextResponse.json(cached);
    }

    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);

    let posts;

    if (filterType === 'following') {
      posts = await queryFollowing(db, userId, now, limit, offset);
    } else if (filterTag) {
      posts = await queryByTag(db, filterTag, now, limit, offset);
    } else {
      posts = await queryBlended(db, userId, now, limit);
    }

    posts = await enrichPosts(db, posts, userId);

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
    SELECT ${BLOG_FIELDS}
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

// ─── Bucket B: Interest-matched (explicit picks + implicit taste signals) ──
async function queryInterests(db, userId, now, limit) {
  const cutoff = now - 14 * 86400;
  const signalCutoff = now - 30 * 86400;
  const result = await db.prepare(`
    SELECT ${BLOG_FIELDS}
    FROM blogs b
    WHERE b.status = 'published' AND b.published_at > ?
      AND b.id IN (
        SELECT blog_id FROM blog_tags WHERE tag IN (
          SELECT tag FROM user_interests WHERE user_id = ?
          UNION
          SELECT DISTINCT tag FROM user_signals WHERE user_id = ? AND tag IS NOT NULL AND created_at > ?
        )
      )
      AND b.author_id != ?
    ORDER BY b.published_at DESC
    LIMIT ?
  `).bind(cutoff, userId, userId, signalCutoff, userId, limit).all();
  return result?.results || [];
}

// ─── Bucket C: Trending ──────────────────────────────────────────────
async function queryTrending(db, now, limit, offset) {
  const cutoff = now - 14 * 86400;
  const result = await db.prepare(`
    SELECT ${BLOG_FIELDS}
    FROM blogs b
    WHERE b.status = 'published' AND b.published_at > ?
    ORDER BY b.like_count DESC, b.view_count DESC, b.published_at DESC
    LIMIT ? OFFSET ?
  `).bind(cutoff, limit, offset).all();
  return result?.results || [];
}

// ─── Tag-filtered ────────────────────────────────────────────────────
async function queryByTag(db, tag, now, limit, offset) {
  const cutoff = now - 30 * 86400;
  const result = await db.prepare(`
    SELECT ${BLOG_FIELDS}
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

// ─── Enrich posts with author, tags, permissions ────────────────────
async function enrichPosts(db, posts, userId) {
  if (posts.length === 0) return posts;

  const authorIds = [...new Set(posts.map(p => p.author_id))];
  const blogIds = posts.map(p => p.id);

  const [authors, tags] = await Promise.all([
    batchQuery(db, 'SELECT id, username, display_name, avatar_url FROM users WHERE id IN', authorIds),
    batchQuery(db, 'SELECT blog_id, tag FROM blog_tags WHERE blog_id IN', blogIds),
  ]);

  // Fetch co-author counts
  const coAuthorCountMap = {};
  if (blogIds.length > 0) {
    const placeholders = blogIds.map(() => '?').join(',');
    const caResult = await db.prepare(
      `SELECT blog_id, COUNT(*) as count FROM blog_co_authors WHERE blog_id IN (${placeholders}) GROUP BY blog_id`
    ).bind(...blogIds).all();
    for (const row of (caResult?.results || [])) {
      coAuthorCountMap[row.blog_id] = row.count;
    }
  }

  const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));
  const tagMap = {};
  for (const t of tags) {
    if (!tagMap[t.blog_id]) tagMap[t.blog_id] = [];
    tagMap[t.blog_id].push(t.tag);
  }

  // Fetch org names for posts published under an org
  const orgIds = [...new Set(posts.filter(p => p.published_as?.startsWith('org:')).map(p => p.published_as.replace('org:', '')))];
  const orgMap = {};
  if (orgIds.length > 0) {
    const orgs = await batchQuery(db, 'SELECT id, slug, name, logo_r2_key FROM orgs WHERE id IN', orgIds);
    for (const o of orgs) orgMap[o.id] = o;
  }

  let orgMemberSet = new Set();
  if (userId && orgIds.length > 0) {
    const memberRows = await batchQuery(db, "SELECT org_id || ':' || user_id as key FROM org_members WHERE role IN ('admin','maintain','write') AND user_id = '" + userId + "' AND org_id IN", orgIds);
    orgMemberSet = new Set(memberRows.map(r => r.key));
  }

  return posts.map(p => {
    const isAuthor = userId && p.author_id === userId;
    const orgId = p.published_as?.startsWith('org:') ? p.published_as.replace('org:', '') : null;
    const isOrgMember = orgId && orgMemberSet.has(`${orgId}:${userId}`);
    const org = orgId ? orgMap[orgId] || null : null;
    return {
      ...p,
      author: authorMap[p.author_id] || { username: 'unknown', display_name: 'Unknown' },
      org: org ? { id: org.id, slug: org.slug, name: org.name, logo_url: org.logo_r2_key } : null,
      co_author_count: coAuthorCountMap[p.id] || 0,
      tags: tagMap[p.id] || [],
      is_staff: p.published_as === `org:${STAFF_ORG_ID}`,
      can_edit: !!(isAuthor || isOrgMember),
    };
  });
}

// ─── Batch query helper ──────────────────────────────────────────────
async function batchQuery(db, queryPrefix, ids) {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = await db.prepare(`${queryPrefix} (${placeholders})`).bind(...ids).all();
  return result?.results || [];
}
