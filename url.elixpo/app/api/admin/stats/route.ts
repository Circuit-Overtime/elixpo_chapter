import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { clampInt } from '@/lib/validate';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDB();
  const url = new URL(request.url);
  const days = clampInt(url.searchParams.get('days'), 7, 1, 90);
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [totalUsers, totalUrls, totalClicks, recentClicks, adminCount, timeline, topUrls, topCountries] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM urls').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM clicks').first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM clicks WHERE clicked_at >= ?').bind(since).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").first<{ count: number }>(),
    db.prepare('SELECT DATE(clicked_at) as date, COUNT(*) as count FROM clicks WHERE clicked_at >= ? GROUP BY DATE(clicked_at) ORDER BY date').bind(since).all(),
    db.prepare('SELECT u.short_code, u.original_url, u.clicks, usr.display_name as owner FROM urls u JOIN users usr ON u.user_id = usr.id ORDER BY u.clicks DESC LIMIT 10').all(),
    db.prepare('SELECT country, COUNT(*) as count FROM clicks WHERE clicked_at >= ? GROUP BY country ORDER BY count DESC LIMIT 10').bind(since).all(),
  ]);

  return NextResponse.json({
    total_users: totalUsers?.count || 0,
    total_urls: totalUrls?.count || 0,
    total_clicks: totalClicks?.count || 0,
    recent_clicks: recentClicks?.count || 0,
    admin_count: adminCount?.count || 0,
    max_admins: 15,
    timeline: timeline.results,
    top_urls: topUrls.results,
    top_countries: topCountries.results,
  });
}
