import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, auditLog } from '@/lib/auth';
import { getDB, getKV, getEnv } from '@/lib/db';
import { generateShortCode } from '@/lib/utils';
import { TIER_LIMITS, type UrlRecord } from '@/lib/types';
import {
  badRequest,
  clampInt,
  validateFutureDate,
  validateLength,
  validateSlug,
  validateUrl,
} from '@/lib/validate';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit } from '@/lib/ratelimit';
import { checkSafeBrowsing, threatMessage } from '@/lib/safebrowsing';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // CSRF defense-in-depth (Lax cookie already blocks the common vector)
  const csrfErr = requireSameOrigin(request);
  if (csrfErr) return csrfErr;

  // 30 URL creations per minute per IP
  const limited = await rateLimit(request, 'url:create', 30, 60);
  if (limited) return limited;

  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await request.json();
  const { url, custom_code, title, expires_at } = body;
  const limits = TIER_LIMITS[user.tier];
  const db = getDB();
  const kv = getKV();
  const env = getEnv();

  // Validate URL — static checks first (free, instant)
  if (!url || typeof url !== 'string') return badRequest('url is required');
  const urlErr = validateUrl(url);
  if (urlErr) return badRequest(urlErr);

  // Safe Browsing — paid signal, only runs if SAFE_BROWSING_API_KEY is set.
  // Treated as a non-blocker if the API is down (fail-open by design — see
  // lib/safebrowsing.ts). Real positives DO block.
  const threat = await checkSafeBrowsing(url, env.SAFE_BROWSING_API_KEY);
  if (threat) {
    return NextResponse.json(
      { error: threatMessage(threat) },
      { status: 422 },
    );
  }

  // Validate title length
  if (title) {
    if (typeof title !== 'string') return badRequest('title must be a string');
    const titleErr = validateLength(title, 'Title', 1, 255);
    if (titleErr) return badRequest(titleErr);
  }

  // Validate expires_at
  if (expires_at) {
    if (!limits.expiringLinks) {
      return NextResponse.json({ error: 'Expiring links require Pro tier or above' }, { status: 403 });
    }
    const dateErr = validateFutureDate(expires_at);
    if (dateErr) return badRequest(dateErr);
  }

  // Check URL limit
  if (limits.maxUrls !== -1) {
    const count = await db.prepare('SELECT COUNT(*) as count FROM urls WHERE user_id = ?')
      .bind(user.id).first<{ count: number }>();
    if ((count?.count || 0) >= limits.maxUrls) {
      return NextResponse.json({ error: `URL limit reached (${limits.maxUrls} for ${user.tier} tier)` }, { status: 403 });
    }
  }

  // Validate custom code (reserved/NSFW check + DB uniqueness)
  if (custom_code) {
    if (!limits.customCodes) {
      return NextResponse.json({ error: 'Custom short codes require Pro tier or above' }, { status: 403 });
    }
    if (typeof custom_code !== 'string') return badRequest('custom_code must be a string');

    const slugErr = validateSlug(custom_code);
    if (slugErr) return badRequest(slugErr);

    const existing = await db.prepare('SELECT id FROM urls WHERE short_code = ?').bind(custom_code).first();
    if (existing) return NextResponse.json({ error: 'Short code already taken' }, { status: 409 });
  }

  // For auto-generated codes, retry up to 5 times if we hit a
  // reserved/NSFW collision (extremely rare with a 6-char alphanum space).
  let shortCode = custom_code;
  if (!shortCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateShortCode();
      if (!validateSlug(candidate)) {
        shortCode = candidate;
        break;
      }
    }
    if (!shortCode) {
      return NextResponse.json({ error: 'Could not generate a safe slug, please retry' }, { status: 500 });
    }
  }

  const result = await db
    .prepare('INSERT INTO urls (user_id, short_code, original_url, title, expires_at) VALUES (?, ?, ?, ?, ?) RETURNING *')
    .bind(user.id, shortCode, url, title || null, expires_at ? new Date(expires_at).toISOString() : null)
    .first<UrlRecord>();

  // Cache in KV
  const kvValue = JSON.stringify({ url, id: result!.id });
  const ttl = expires_at ? Math.max(Math.floor((new Date(expires_at).getTime() - Date.now()) / 1000), 60) : undefined;
  kv.put(`url:${shortCode}`, kvValue, { expirationTtl: ttl }).catch(() => {});

  auditLog(user.id, 'url.create', 'url', shortCode, url).catch(() => {});

  return NextResponse.json({
    short_url: `${env.BASE_URL}/${shortCode}`,
    short_code: shortCode,
    original_url: url,
    title: result?.title,
    created_at: result?.created_at,
    expires_at: result?.expires_at,
  }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDB();
  const url = new URL(request.url);
  const limit = clampInt(url.searchParams.get('limit'), 50, 1, 100);
  const offset = clampInt(url.searchParams.get('offset'), 0, 0, 100000);
  const search = (url.searchParams.get('search') || '').slice(0, 100); // cap search length

  let query = 'SELECT * FROM urls WHERE user_id = ?';
  const params: any[] = [user.id];

  if (search) {
    // Escape LIKE wildcards in user input
    const escaped = search.replace(/[%_]/g, '\\$&');
    const like = `%${escaped}%`;
    query += " AND (short_code LIKE ? ESCAPE '\\' OR original_url LIKE ? ESCAPE '\\' OR title LIKE ? ESCAPE '\\')";
    params.push(like, like, like);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [{ results }, total] = await Promise.all([
    db.prepare(query).bind(...params).all<UrlRecord>(),
    db.prepare('SELECT COUNT(*) as count FROM urls WHERE user_id = ?')
      .bind(user.id).first<{ count: number }>(),
  ]);

  return NextResponse.json({ urls: results, total: total?.count || 0, limit, offset });
}
