import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { TIER_LIMITS } from '@/lib/types';
import { clampInt } from '@/lib/validate';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limits = TIER_LIMITS[user.tier];
  if (!limits.analytics) {
    return NextResponse.json({ error: 'Analytics require Pro tier or above' }, { status: 403 });
  }

  const { code } = await params;
  const url = new URL(request.url);
  const days = clampInt(url.searchParams.get('days'), 7, 1, limits.maxClicksRetention);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const db = getDB();

  const urlRecord = await db.prepare('SELECT id FROM urls WHERE short_code = ? AND user_id = ?')
    .bind(code, user.id).first<{ id: number }>();
  if (!urlRecord) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [timeline, countries, browsers, devices, referers] = await Promise.all([
    db.prepare('SELECT DATE(clicked_at) as date, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY DATE(clicked_at) ORDER BY date')
      .bind(urlRecord.id, since).all<{ date: string; count: number }>(),
    db.prepare('SELECT country, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY country ORDER BY count DESC LIMIT 20')
      .bind(urlRecord.id, since).all<{ country: string; count: number }>(),
    db.prepare('SELECT browser, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY browser ORDER BY count DESC LIMIT 20')
      .bind(urlRecord.id, since).all<{ browser: string; count: number }>(),
    db.prepare('SELECT device, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? GROUP BY device ORDER BY count DESC LIMIT 10')
      .bind(urlRecord.id, since).all<{ device: string; count: number }>(),
    db.prepare('SELECT referer, COUNT(*) as count FROM clicks WHERE url_id = ? AND clicked_at >= ? AND referer IS NOT NULL GROUP BY referer ORDER BY count DESC LIMIT 20')
      .bind(urlRecord.id, since).all<{ referer: string; count: number }>(),
  ]);

  return NextResponse.json({
    timeline: timeline.results,
    countries: countries.results,
    browsers: browsers.results,
    devices: devices.results,
    referers: referers.results,
  });
}
