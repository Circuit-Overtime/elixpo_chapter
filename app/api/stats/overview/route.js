export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { metricDefinition, parseAnalyticsRange, percentChange } from '../../../../lib/analytics';

function results(value) {
  return value?.results || [];
}

function count(value) {
  return Number(value?.c || 0);
}

async function resolveScope(db, userId, requestedScope) {
  if (!requestedScope || requestedScope === 'personal') {
    return {
      key: 'personal',
      label: 'Personal',
      predicate: "b.author_id = ? AND (b.published_as = 'personal' OR b.published_as IS NULL)",
      values: [userId],
      followerPredicate: "following_id = ? AND following_type = 'user'",
      followerValues: [userId],
    };
  }

  if (!requestedScope.startsWith('org:')) throw new Error('Invalid analytics scope');
  const orgId = requestedScope.slice(4);
  const org = await db.prepare(`
    SELECT o.id, o.name FROM orgs o
    LEFT JOIN org_members om ON om.org_id = o.id AND om.user_id = ?
    WHERE o.id = ? AND (o.owner_id = ? OR om.role IN ('admin', 'maintain'))
  `).bind(userId, orgId, userId).first();
  if (!org) {
    const error = new Error('Not authorized to view organization analytics');
    error.status = 403;
    throw error;
  }
  return {
    key: requestedScope,
    label: org.name,
    predicate: 'b.published_as = ?',
    values: [requestedScope],
    followerPredicate: "following_id = ? AND following_type = 'org'",
    followerValues: [orgId],
  };
}

async function getPeriodMetrics(db, scope, from, to) {
  const values = scope.values;
  const queries = await Promise.all([
    db.prepare(`SELECT COUNT(*) c FROM blog_views bv JOIN blogs b ON b.id = bv.blog_id WHERE ${scope.predicate} AND bv.created_at >= ? AND bv.created_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(DISTINCT bv.ip_hash) c FROM blog_views bv JOIN blogs b ON b.id = bv.blog_id WHERE ${scope.predicate} AND bv.created_at >= ? AND bv.created_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(*) c FROM read_history rh JOIN blogs b ON b.id = rh.blog_id WHERE ${scope.predicate} AND rh.read_progress > .5 AND rh.read_at >= ? AND rh.read_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(*) c FROM read_history rh JOIN blogs b ON b.id = rh.blog_id WHERE ${scope.predicate} AND rh.read_progress >= .9 AND rh.read_at >= ? AND rh.read_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COALESCE(AVG(rh.read_progress), 0) c FROM read_history rh JOIN blogs b ON b.id = rh.blog_id WHERE ${scope.predicate} AND rh.read_at >= ? AND rh.read_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(*) c FROM likes x JOIN blogs b ON b.id = x.blog_id WHERE ${scope.predicate} AND x.created_at >= ? AND x.created_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(*) c FROM comments x JOIN blogs b ON b.id = x.blog_id WHERE ${scope.predicate} AND x.created_at >= ? AND x.created_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(*) c FROM bookmarks x JOIN blogs b ON b.id = x.blog_id WHERE ${scope.predicate} AND x.created_at >= ? AND x.created_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COALESCE(SUM(x.count), 0) c FROM claps x JOIN blogs b ON b.id = x.blog_id WHERE ${scope.predicate} AND x.created_at >= ? AND x.created_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(*) c FROM analytics_events ae JOIN blogs b ON b.id = ae.blog_id WHERE ${scope.predicate} AND ae.event_type = 'share' AND ae.occurred_at >= ? AND ae.occurred_at < ?`).bind(...values, from, to).first(),
    db.prepare(`SELECT COUNT(*) c FROM follows WHERE ${scope.followerPredicate} AND created_at >= ? AND created_at < ?`).bind(...scope.followerValues, from, to).first(),
  ]);

  const [views, uniqueVisitors, reads, completions, avgProgress, likes, comments, bookmarks, claps, shares, followers] = queries.map(count);
  const engagements = likes + comments + bookmarks + shares;
  return {
    views,
    uniqueVisitors,
    reads,
    completionRate: reads ? Math.round((completions / reads) * 1000) / 10 : 0,
    avgReadProgress: Math.round(avgProgress * 1000) / 10,
    likes,
    comments,
    bookmarks,
    claps,
    shares,
    engagementRate: views ? Math.round((engagements / views) * 1000) / 10 : 0,
    followers,
  };
}

function buildTrend(from, to, viewRows, readRows) {
  const day = 86400;
  const byView = Object.fromEntries(viewRows.map(row => [row.day, Number(row.value)]));
  const byRead = Object.fromEntries(readRows.map(row => [row.day, Number(row.value)]));
  const labels = [];
  const views = [];
  const reads = [];
  for (let cursor = Math.floor(from / day) * day; cursor < to; cursor += day) {
    const label = new Date(cursor * 1000).toISOString().slice(0, 10);
    labels.push(label);
    views.push(byView[label] || 0);
    reads.push(byRead[label] || 0);
  }
  return { labels, views, reads };
}

export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const params = new URL(request.url).searchParams;
    const range = parseAnalyticsRange(params);
    const scope = await resolveScope(db, session.userId, params.get('scope'));
    const values = scope.values;

    const [current, previous, published, drafts, dailyViews, dailyReads, topPosts, sources, referrers, devices, countries, audience, eventCount] = await Promise.all([
      getPeriodMetrics(db, scope, range.from, range.to),
      getPeriodMetrics(db, scope, range.previousFrom, range.previousTo),
      db.prepare(`SELECT COUNT(*) c FROM blogs b WHERE ${scope.predicate} AND b.status = 'published'`).bind(...values).first(),
      db.prepare(`SELECT COUNT(*) c FROM blogs b WHERE ${scope.predicate} AND b.status = 'draft'`).bind(...values).first(),
      db.prepare(`SELECT date(bv.created_at, 'unixepoch') day, COUNT(*) value FROM blog_views bv JOIN blogs b ON b.id = bv.blog_id WHERE ${scope.predicate} AND bv.created_at >= ? AND bv.created_at < ? GROUP BY day ORDER BY day`).bind(...values, range.from, range.to).all(),
      db.prepare(`SELECT date(rh.read_at, 'unixepoch') day, COUNT(*) value FROM read_history rh JOIN blogs b ON b.id = rh.blog_id WHERE ${scope.predicate} AND rh.read_progress > .5 AND rh.read_at >= ? AND rh.read_at < ? GROUP BY day ORDER BY day`).bind(...values, range.from, range.to).all(),
      db.prepare(`
        SELECT b.id, b.title, b.slug, b.published_at,
          COUNT(DISTINCT bv.id) views, COUNT(DISTINCT bv.ip_hash) unique_visitors,
          COUNT(DISTINCT CASE WHEN rh.read_progress > .5 THEN rh.user_id END) reads,
          COALESCE(AVG(rh.read_progress), 0) avg_progress,
          COUNT(DISTINCT l.user_id) likes,
          COUNT(DISTINCT cm.id) comments,
          COUNT(DISTINCT bm.user_id) bookmarks
        FROM blogs b
        LEFT JOIN blog_views bv ON bv.blog_id = b.id AND bv.created_at >= ? AND bv.created_at < ?
        LEFT JOIN read_history rh ON rh.blog_id = b.id AND rh.read_at >= ? AND rh.read_at < ?
        LEFT JOIN likes l ON l.blog_id = b.id AND l.created_at >= ? AND l.created_at < ?
        LEFT JOIN comments cm ON cm.blog_id = b.id AND cm.created_at >= ? AND cm.created_at < ?
        LEFT JOIN bookmarks bm ON bm.blog_id = b.id AND bm.created_at >= ? AND bm.created_at < ?
        WHERE ${scope.predicate} AND b.status = 'published'
        GROUP BY b.id ORDER BY views DESC LIMIT 100
      `).bind(range.from, range.to, range.from, range.to, range.from, range.to, range.from, range.to, range.from, range.to, ...values).all(),
      db.prepare(`SELECT COALESCE(ae.referrer_source, 'Direct') label, COUNT(*) value FROM analytics_events ae JOIN blogs b ON b.id = ae.blog_id WHERE ${scope.predicate} AND ae.event_type = 'view' AND ae.occurred_at >= ? AND ae.occurred_at < ? GROUP BY label ORDER BY value DESC`).bind(...values, range.from, range.to).all(),
      db.prepare(`SELECT ae.referrer_domain label, COUNT(*) value FROM analytics_events ae JOIN blogs b ON b.id = ae.blog_id WHERE ${scope.predicate} AND ae.event_type = 'view' AND ae.referrer_domain IS NOT NULL AND ae.occurred_at >= ? AND ae.occurred_at < ? GROUP BY label ORDER BY value DESC LIMIT 10`).bind(...values, range.from, range.to).all(),
      db.prepare(`SELECT COALESCE(ae.device_category, 'Unknown') label, COUNT(DISTINCT ae.visitor_hash) value FROM analytics_events ae JOIN blogs b ON b.id = ae.blog_id WHERE ${scope.predicate} AND ae.event_type = 'view' AND ae.occurred_at >= ? AND ae.occurred_at < ? GROUP BY label ORDER BY value DESC`).bind(...values, range.from, range.to).all(),
      db.prepare(`SELECT COALESCE(ae.country_code, 'Unknown') label, COUNT(DISTINCT ae.visitor_hash) value FROM analytics_events ae JOIN blogs b ON b.id = ae.blog_id WHERE ${scope.predicate} AND ae.event_type = 'view' AND ae.occurred_at >= ? AND ae.occurred_at < ? GROUP BY label ORDER BY value DESC LIMIT 10`).bind(...values, range.from, range.to).all(),
      db.prepare(`
        SELECT
          COUNT(DISTINCT CASE WHEN first_seen >= ? THEN visitor_hash END) new_readers,
          COUNT(DISTINCT CASE WHEN first_seen < ? THEN visitor_hash END) returning_readers,
          COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN visitor_hash END) signed_in,
          COUNT(DISTINCT CASE WHEN user_id IS NULL THEN visitor_hash END) anonymous
        FROM (
          SELECT ae.visitor_hash, MIN(ae.occurred_at) first_seen, MAX(ae.user_id) user_id
          FROM analytics_events ae JOIN blogs b ON b.id = ae.blog_id
          WHERE ${scope.predicate} AND ae.event_type = 'view' AND ae.occurred_at < ?
          GROUP BY ae.visitor_hash HAVING MAX(ae.occurred_at) >= ?
        )
      `).bind(range.from, range.from, ...values, range.to, range.from).first(),
      db.prepare(`SELECT COUNT(*) c FROM analytics_events ae JOIN blogs b ON b.id = ae.blog_id WHERE ${scope.predicate} AND ae.occurred_at >= ? AND ae.occurred_at < ?`).bind(...values, range.from, range.to).first(),
    ]);

    const changes = Object.fromEntries(Object.keys(current).map(key => [key, percentChange(current[key], previous[key])]));
    const posts = results(topPosts).map(post => {
      const engagement = Number(post.likes) + Number(post.comments) + Number(post.bookmarks);
      return {
        id: post.id,
        title: post.title || 'Untitled',
        slug: post.slug,
        publishedAt: post.published_at,
        views: Number(post.views),
        uniqueVisitors: Number(post.unique_visitors),
        reads: Number(post.reads),
        completionRate: Number(post.reads) ? Math.round((Number(post.avg_progress) >= .9 ? 1 : Number(post.avg_progress)) * 1000) / 10 : 0,
        avgReadProgress: Math.round(Number(post.avg_progress) * 1000) / 10,
        engagement,
        engagementRate: Number(post.views) ? Math.round((engagement / Number(post.views)) * 1000) / 10 : 0,
      };
    });

    return NextResponse.json({
      range,
      scope: { key: scope.key, label: scope.label },
      totals: { ...current, published: count(published), drafts: count(drafts) },
      previous,
      changes,
      trend: buildTrend(range.from, range.to, results(dailyViews), results(dailyReads)),
      posts,
      audience: {
        newReaders: Number(audience?.new_readers || 0),
        returningReaders: Number(audience?.returning_readers || 0),
        signedIn: Number(audience?.signed_in || 0),
        anonymous: Number(audience?.anonymous || 0),
        devices: results(devices),
        countries: results(countries),
      },
      acquisition: { sources: results(sources), referrers: results(referrers) },
      funnel: [
        { label: 'Views', value: current.views },
        { label: 'Reads', value: current.reads },
        { label: 'Engagements', value: current.likes + current.comments + current.bookmarks + current.shares },
        { label: 'Follows', value: current.followers },
      ],
      definitions: Object.fromEntries(['views', 'uniqueVisitors', 'reads', 'completionRate', 'avgReadProgress', 'engagementRate', 'followers'].map(key => [key, metricDefinition(key)])),
      dimensionsCollecting: count(eventCount) === 0,
    });
  } catch (error) {
    const status = error.status || (/range|scope/i.test(error.message) ? 400 : 500);
    console.error('[stats/overview] failed:', error);
    return NextResponse.json({ error: error.message || 'Could not load analytics' }, { status });
  }
}
