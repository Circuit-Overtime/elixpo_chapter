import { type NextRequest, NextResponse } from 'next/server';
import { getDB, getEnv, getKV } from '@/lib/db';
import type { BillingStatus, Tier } from '@/lib/types';

export const runtime = 'edge';

/**
 * POST /api/webhooks/pay
 *
 * Inbound webhook from Elixpo Pay. Fired on `entitlement.updated` — i.e.
 * on first purchase, every autopay renewal, and on cancellation/lapse.
 * This is what flips a user's tier; because getCurrentUser() reads `tier`
 * fresh from D1 on every request (KV only caches session→userId), the new
 * tier and its gates take effect on the user's very next request — no cache
 * bust needed.
 *
 * ─── Signature (Elixpo Pay scheme) ───────────────────────────────────
 *   X-Elixpo-Signature: t=<unix_seconds>,v1=<hex HMAC-SHA256>
 *   signed payload = `${t}.${rawBody}`, key = ELIXPO_PAY_WEBHOOK_SECRET.
 *   Rejected outside a ±5 minute window.
 *
 * ─── Body (entitlement.updated) ──────────────────────────────────────
 *   {
 *     "event": "entitlement.updated",
 *     "app": "lixurl",
 *     "uid": "<elixpo_id>",
 *     "product": "pro" | "business",
 *     "active": true | false,
 *     "current_period_end": "<ISO>",     // when access lapses
 *     "subscription": { "id": "sub_…" }   // autopay mandate
 *   }
 *
 * Failure semantics mirror /api/webhooks/elixpo:
 *   401 bad signature/timestamp · 400 malformed · 200 dup/ignored ·
 *   500 DB error (Pay retries) · 503 receiver not configured.
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  if (!env.ELIXPO_PAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Pay webhook not configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get('x-elixpo-signature') || '';
  const parsed = parseSignature(sigHeader);
  if (!parsed) return reject('missing or malformed signature');

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(parsed.t) || Math.abs(now - parsed.t) > 300) {
    return reject('timestamp outside ±5 minute window');
  }

  const ok = await verifyHmac(env.ELIXPO_PAY_WEBHOOK_SECRET, `${parsed.t}.${rawBody}`, parsed.v1);
  if (!ok) return reject('invalid signature');

  let body: PayEvent;
  try {
    body = JSON.parse(rawBody) as PayEvent;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Idempotency — Pay retries on 5xx. Dedupe on event id (header or body).
  const eventId = request.headers.get('x-elixpo-event-id') || body.id;
  const kv = getKV();
  if (eventId) {
    if (await kv.get(`wh:pay:${eventId}`)) {
      return NextResponse.json({ ok: true, deduped: true });
    }
    await kv.put(`wh:pay:${eventId}`, '1', { expirationTtl: 1800 }).catch(() => {});
  }

  if (body.event && body.event !== 'entitlement.updated') {
    // Accept-and-ignore unrelated events so Pay stops retrying.
    return NextResponse.json({ ok: true, ignored: body.event });
  }
  if (!body.uid) {
    return NextResponse.json({ error: 'missing uid' }, { status: 400 });
  }

  try {
    await applyEntitlement(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook:pay] handler error', err);
    return NextResponse.json({ error: 'handler failed' }, { status: 500 });
  }
}

// ─── Apply the entitlement to our user row ──────────────────────────

const PAID_TIERS = new Set<Tier>(['pro', 'business', 'enterprise']);

async function applyEntitlement(ev: PayEvent): Promise<void> {
  const db = getDB();

  // active + recognized product → grant that tier. Otherwise (cancel,
  // lapse, unknown product) → fall back to free.
  const product = (ev.product || '').toLowerCase() as Tier;
  const granting = ev.active === true && PAID_TIERS.has(product);

  const tier: Tier = granting ? product : 'free';
  const status: BillingStatus = granting
    ? normalizeStatus(ev.status)
    : ev.active === false
      ? 'canceled'
      : 'none';
  const expiresAt = granting ? normalizeIso(ev.current_period_end ?? ev.expires_at) : null;
  const subId = ev.subscription?.id ?? ev.subscription_id ?? null;

  // Update by elixpo_id (the uid Pay knows the buyer by). Only touches the
  // row if the user exists in our DB; a no-op otherwise (idempotent).
  await db
    .prepare(
      `UPDATE users
         SET tier = ?, billing_status = ?, tier_expires_at = ?,
             pay_subscription_id = COALESCE(?, pay_subscription_id),
             updated_at = datetime('now')
       WHERE elixpo_id = ?`,
    )
    .bind(tier, status, expiresAt, subId, ev.uid)
    .run();
}

function normalizeStatus(s?: string): BillingStatus {
  switch ((s || '').toLowerCase()) {
    case 'past_due':
    case 'pending':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    default:
      return 'active';
  }
}

/** Coerce Pay's timestamp to a Z-suffixed ISO string for safe comparison. */
function normalizeIso(v?: string | number | null): string | null {
  if (v == null) return null;
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── Signature helpers (t=,v1= scheme) ──────────────────────────────

interface PayEvent {
  id?: string;
  event?: string;
  app?: string;
  uid?: string;
  product?: string;
  active?: boolean;
  status?: string;
  current_period_end?: string | number;
  expires_at?: string | number;
  subscription?: { id?: string };
  subscription_id?: string;
}

function parseSignature(header: string): { t: number; v1: string } | null {
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!parts.t || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return null;
  return { t, v1 };
}

async function verifyHmac(secret: string, signed: string, sigHex: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, hexToBytes(sigHex), enc.encode(signed));
}

function hexToBytes(hex: string): ArrayBuffer {
  const buf = new ArrayBuffer(hex.length / 2);
  const view = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return buf;
}

function reject(reason: string): NextResponse {
  console.warn(`[webhook:pay] reject — ${reason}`);
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
