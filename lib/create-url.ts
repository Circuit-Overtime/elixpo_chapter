import { NextResponse } from 'next/server';
import { auditLog } from '@/lib/auth';
import { getDB, getEnv, getKV } from '@/lib/db';
import { checkSafeBrowsing, threatMessage } from '@/lib/safebrowsing';
import { putRedirectCache } from '@/lib/redirect-cache';
import {
  claimFreeCreation,
  releaseFreeCreation,
} from '@/lib/account-quota';
import type { GuestRiskIdentity } from '@/lib/guest-risk';
import { TIER_LIMITS, type UrlRecord, type User } from '@/lib/types';
import { generateShortCode } from '@/lib/utils';
import {
  badRequest,
  validateFutureDate,
  validateLength,
  validateSlug,
  validateUrl,
} from '@/lib/validate';

export interface CreateUrlInput {
  url?: unknown;
  custom_code?: unknown;
  title?: unknown;
  expires_at?: unknown;
}

/** Shared URL creation path for the LixRL UI/API and trusted integrations. */
export async function createUrlForUser(
  user: User,
  input: CreateUrlInput,
  creationRisk?: GuestRiskIdentity,
) {
  const { url, custom_code, title, expires_at } = input;
  const limits = TIER_LIMITS[user.tier];
  const db = getDB();
  const kv = getKV();
  const env = getEnv();

  if (!url || typeof url !== 'string') return badRequest('url is required');
  const urlErr = validateUrl(url);
  if (urlErr) return badRequest(urlErr);

  const threat = await checkSafeBrowsing(url, env.SAFE_BROWSING_API_KEY);
  if (threat) {
    return NextResponse.json({ error: threatMessage(threat) }, { status: 422 });
  }

  if (title) {
    if (typeof title !== 'string') return badRequest('title must be a string');
    const titleErr = validateLength(title, 'Title', 1, 255);
    if (titleErr) return badRequest(titleErr);
  }

  if (expires_at) {
    if (!limits.expiringLinks) {
      return NextResponse.json({ error: 'Expiring links require Pro tier or above' }, { status: 403 });
    }
    if (typeof expires_at !== 'string') return badRequest('expires_at must be a string');
    const dateErr = validateFutureDate(expires_at);
    if (dateErr) return badRequest(dateErr);
  }

  if (limits.maxUrls !== -1) {
    const count = await db.prepare('SELECT COUNT(*) as count FROM urls WHERE user_id = ?')
      .bind(user.id).first<{ count: number }>();
    if ((count?.count || 0) >= limits.maxUrls) {
      return NextResponse.json({ error: `URL limit reached (${limits.maxUrls} for ${user.tier} tier)` }, { status: 403 });
    }
  }

  if (custom_code) {
    if (!limits.customCodes) {
      return NextResponse.json({ error: 'Custom short codes require Pro tier or above' }, { status: 403 });
    }
    if (typeof custom_code !== 'string') return badRequest('custom_code must be a string');
    const slugErr = validateSlug(custom_code);
    if (slugErr) return badRequest(slugErr);

    const existing = await db.prepare(
      `SELECT short_code FROM urls WHERE short_code = ?
       UNION ALL
       SELECT short_code FROM guest_links WHERE short_code = ?
       LIMIT 1`,
    ).bind(custom_code, custom_code).first();
    if (existing) return NextResponse.json({ error: 'Short code already taken' }, { status: 409 });
  }

  let shortCode = typeof custom_code === 'string' ? custom_code : '';
  if (!shortCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateShortCode();
      if (!validateSlug(candidate)) {
        const collision = await db.prepare(
          `SELECT short_code FROM urls WHERE short_code = ?
           UNION ALL
           SELECT short_code FROM guest_links WHERE short_code = ?
           LIMIT 1`,
        ).bind(candidate, candidate).first();
        if (!collision) {
          shortCode = candidate;
          break;
        }
      }
    }
    if (!shortCode) {
      return NextResponse.json({ error: 'Could not generate a safe slug, please retry' }, { status: 500 });
    }
  }

  const quotaClaim = user.tier === 'free'
    ? await claimFreeCreation(user.id, creationRisk)
    : null;
  if (quotaClaim && !quotaClaim.allowed) {
    const retryAfter = Math.max(
      60,
      Math.ceil((Date.parse(quotaClaim.resetAt) - Date.now()) / 1000),
    );
    return NextResponse.json(
      {
        error: 'Free accounts can create 2 links per UTC day',
        available_at: quotaClaim.resetAt,
      },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const expiry = typeof expires_at === 'string' ? new Date(expires_at).toISOString() : null;
  let result: UrlRecord | null = null;
  try {
    result = await db.prepare(
      'INSERT INTO urls (user_id, short_code, original_url, title, expires_at) VALUES (?, ?, ?, ?, ?) RETURNING *',
    ).bind(user.id, shortCode, url, typeof title === 'string' ? title : null, expiry).first<UrlRecord>();
  } catch (error) {
    if (quotaClaim) {
      await releaseFreeCreation(user.id, quotaClaim.windowStart).catch(() => {});
    }
    console.error('[url-create] insert failed', error);
    return NextResponse.json({ error: 'Could not create the short link' }, { status: 500 });
  }

  putRedirectCache(kv, shortCode, {
    url,
    id: result!.id,
    expires_at: expiry,
  }).catch(() => {});
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
