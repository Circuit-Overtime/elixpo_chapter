/**
 * Billing helpers — verify payouts.elixpo webhooks and apply tier changes.
 *
 * payouts.elixpo signs outbound webhooks like:
 *   X-Elixpo-Pay-Timestamp: <unix_seconds>
 *   X-Elixpo-Pay-Signature: sha256=<hex>,sha256=<hex>   (comma-separated;
 *                                                       any match passes)
 *   HMAC input: `${timestamp}.${rawBody}` over PAYOUTS_WEBHOOK_SECRET
 *
 * Tier model:
 *   hobby     — default. No subscription.
 *   indie     — paid. From Pay product/tier mapped via PAY_TIER_INDIE.
 *   studio    — paid.
 *   internal  — admin/team. Set out-of-band; never via webhook.
 *
 * The `tier` field on the inbound entitlement event is the Pay product's
 * tier slug. We accept it as-is when it matches one of our known paid
 * tiers; anything unknown is treated as 'hobby' (graceful downgrade).
 */

import type { D1Database } from "@cloudflare/workers-types";

/** Constant-time hex string comparison. Returns false on length mismatch
 *  without leaking either value's length via early return. */
function timingSafeEqualHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

/** Tiers users can hold. Order matters for upgrade comparisons. */
export type Tier = "hobby" | "indie" | "studio" | "internal";

const KNOWN_PAID_TIERS = new Set<Tier>(["indie", "studio"]);

export function normalizeTier(raw: string | null | undefined): Tier {
    if (!raw) return "hobby";
    const t = raw.trim().toLowerCase();
    if (KNOWN_PAID_TIERS.has(t as Tier)) return t as Tier;
    return "hobby";
}

/**
 * Verify the X-Elixpo-Pay-Signature header against a raw body.
 *
 * The header carries one or more `sha256=<hex>` values separated by commas.
 * We compute the expected hex against PAYOUTS_WEBHOOK_SECRET (the secret
 * the merchant configured on payouts.elixpo when registering the endpoint)
 * and accept if ANY presented value matches — supports key rotation where
 * Pay signs with both the current and previous secret during the grace
 * window.
 */
export async function verifyPayoutsSignature(
    rawBody: string,
    timestampHeader: string | null,
    signatureHeader: string | null,
    secret: string,
): Promise<boolean> {
    if (!timestampHeader || !signatureHeader || !secret) return false;
    // Reject timestamps outside ±5 minutes — bounds replay window if a
    // signature ever leaks. Pay's deliveries should arrive within seconds.
    const t = Number.parseInt(timestampHeader, 10);
    if (!Number.isFinite(t)) return false;
    const skew = Math.abs(Math.floor(Date.now() / 1000) - t);
    if (skew > 300) return false;

    const expected = await hmacSha256Hex(secret, `${timestampHeader}.${rawBody}`);
    const presented = signatureHeader
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.startsWith("sha256="))
        .map((s) => s.slice("sha256=".length));

    for (const candidate of presented) {
        if (timingSafeEqualHex(expected, candidate)) return true;
    }
    return false;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const sig = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(message),
    );
    let out = "";
    for (const b of new Uint8Array(sig)) out += b.toString(16).padStart(2, "0");
    return out;
}

/**
 * Apply an entitlement.updated event to the users row.
 *
 * Returns the previous tier (so callers can decide whether to fire the
 * "subscription activated" email — we only email on UPGRADES, not on
 * silent renewals where the tier stayed the same).
 */
export async function applyEntitlementUpdate(
    db: D1Database,
    params: {
        userId: string;
        tier: Tier;
        expiresAt: string | null;
        providerSubscriptionId: string | null;
    },
): Promise<{ previousTier: Tier; nextTier: Tier }> {
    const row = (await db
        .prepare("SELECT tier, is_internal FROM users WHERE id = ?")
        .bind(params.userId)
        .first()) as { tier: string; is_internal: number } | null;

    const previousTier = (row?.tier ?? "hobby") as Tier;

    // Never overwrite is_internal users' tier via inbound webhook — those
    // accounts skip billing entirely. The webhook event is still recorded
    // in billing_events for audit but the row isn't touched.
    if (row?.is_internal) {
        return { previousTier: "internal", nextTier: "internal" };
    }

    await db
        .prepare(
            `UPDATE users
             SET tier = ?, tier_renews_at = ?, tier_provider_subscription_id = ?
             WHERE id = ?`,
        )
        .bind(
            params.tier,
            params.expiresAt,
            params.providerSubscriptionId,
            params.userId,
        )
        .run();

    return { previousTier, nextTier: params.tier };
}
