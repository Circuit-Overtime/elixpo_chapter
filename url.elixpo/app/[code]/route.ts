import { NextRequest, NextResponse } from 'next/server';
import { getDB, getKV } from '@/lib/db';
import { parseUserAgent, hashIp } from '@/lib/utils';

export const runtime = 'edge';

const SKIP_PATHS = new Set(['favicon.ico', 'robots.txt', 'sitemap.xml', '_next']);

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (SKIP_PATHS.has(code)) {
    return notFoundPage(request);
  }

  const kv = getKV();

  // FAST PATH: KV cache — no DB hit at all
  const cached = await kv.get(`url:${code}`);
  if (cached) {
    const { url, id } = JSON.parse(cached);
    const db = getDB();
    scheduleTracking(db, id, request);
    return redirect(url);
  }

  // SLOW PATH: D1 lookup
  const db = getDB();
  const urlRecord = await db
    .prepare('SELECT id, original_url, is_active, expires_at FROM urls WHERE short_code = ?')
    .bind(code)
    .first<{ id: number; original_url: string; is_active: number; expires_at: string | null }>();

  if (!urlRecord || !urlRecord.is_active) {
    return notFoundPage(request);
  }

  if (urlRecord.expires_at && new Date(urlRecord.expires_at) < new Date()) {
    kv.delete(`url:${code}`).catch(() => {});
    return notFoundPage(request);
  }

  // Re-populate KV cache with appropriate TTL
  const ttl = urlRecord.expires_at
    ? Math.max(Math.floor((new Date(urlRecord.expires_at).getTime() - Date.now()) / 1000), 60)
    : 86400; // 24h default

  kv.put(`url:${code}`, JSON.stringify({ url: urlRecord.original_url, id: urlRecord.id }), { expirationTtl: ttl })
    .catch(() => {});

  scheduleTracking(db, urlRecord.id, request);
  return redirect(urlRecord.original_url);
}

/** Redirect to the 404 page */
function notFoundPage(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/not-found', request.url), 302);
}

/** Build a 302 redirect with cache-friendly headers */
function redirect(url: string): NextResponse {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: url,
      'Cache-Control': 'private, no-cache, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

/** Fire-and-forget click tracking — never blocks the redirect */
function scheduleTracking(db: D1Database, urlId: number, request: NextRequest): void {
  try {
    const ctx = (globalThis as any).__nextOnPagesReqCtx?.ctx as ExecutionContext | undefined;
    const promise = trackClick(db, urlId, request);
    if (ctx?.waitUntil) {
      ctx.waitUntil(promise);
    } else {
      promise.catch(() => {});
    }
  } catch {
    // Silently ignore — never block redirects for analytics
  }
}

async function trackClick(db: D1Database, urlId: number, request: NextRequest): Promise<void> {
  const ua = parseUserAgent(request.headers.get('user-agent'));
  const cf = (request as any).cf as IncomingRequestCfProperties | undefined;

  await db.batch([
    db.prepare('UPDATE urls SET clicks = clicks + 1 WHERE id = ?').bind(urlId),
    db.prepare(
      `INSERT INTO clicks (url_id, country, city, region, device, browser, os, referer, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      urlId,
      cf?.country || null,
      cf?.city || null,
      (cf as any)?.region || null,
      ua.device,
      ua.browser,
      ua.os,
      request.headers.get('referer') || null,
      hashIp(request.headers.get('cf-connecting-ip')),
    ),
  ]);
}
