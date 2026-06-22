export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import {
    applyEntitlementUpdate,
    normalizeTier,
    type Tier,
    verifyPayoutsSignature,
} from "@/lib/billing";
import { getDatabase } from "@/lib/d1-client";
import { sendMail } from "@/lib/mails";
import { generateUUID } from "@/lib/webcrypto";

/**
 * POST /api/webhooks/payouts/entitlement
 *
 * Inbound webhook from payouts.elixpo. Fires on `entitlement.updated` —
 * that single event type covers activated / renewed / expired / cancelled,
 * with the current state carried in the payload.
 *
 * Auth: X-Elixpo-Pay-Signature: sha256=<hex>[,sha256=<hex>...] over
 *       `${timestamp}.${rawBody}` using PAYOUTS_WEBHOOK_SECRET.
 *
 * Idempotent via billing_events.provider_event_id UNIQUE index. Payouts may
 * retry on transient errors — every retry hits the same idempotency key.
 *
 * Always returns 2xx for signature-valid events so payouts stops retrying.
 * Internal errors are logged and recorded in billing_events with status
 * 'deferred'; they're surfaced via logs, not retried by the sender.
 */
export async function POST(request: NextRequest) {
    let rawBody: string;
    try {
        rawBody = await request.text();
    } catch {
        return NextResponse.json({ error: "bad_body" }, { status: 400 });
    }

    const secret = process.env.PAYOUTS_WEBHOOK_SECRET || "";
    const valid = await verifyPayoutsSignature(
        rawBody,
        request.headers.get("x-elixpo-pay-timestamp"),
        request.headers.get("x-elixpo-pay-signature"),
        secret,
    );
    if (!valid) {
        return NextResponse.json(
            { error: "invalid_signature" },
            { status: 401 },
        );
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "bad_json" }, { status: 400 });
    }

    // Envelope shape (per payouts.elixpo's webhook lib):
    //   { id, type: 'entitlement.updated', created_at, data: { ... } }
    const eventId: string | null = payload?.id ?? null;
    const eventType: string = payload?.type ?? "";
    if (eventType !== "entitlement.updated") {
        // Ack so payouts stops retrying — we just don't act on other events.
        return NextResponse.json({ ok: true, ignored: eventType });
    }

    const data = payload?.data ?? {};
    // The consuming-app's external_uid is the accounts.elixpo user id.
    const userId: string = data.uid ?? data.external_uid ?? "";
    if (!userId) {
        return NextResponse.json({ ok: true, ignored: "no_uid" });
    }

    const active: boolean = data.active === true || data.status === "active";
    const tierRaw: string | null = data.tier ?? null;
    const expiresAt: string | null = data.expires_at ?? null;
    const providerSubscriptionId: string | null =
        data.provider_subscription_id ?? data.subscription_id ?? null;

    // When inactive, downgrade to hobby regardless of what `tier` says.
    const nextTier: Tier = active ? normalizeTier(tierRaw) : "hobby";

    const db = await getDatabase();

    // Replay guard: dedupe on the event id. The UNIQUE index on
    // billing_events.provider_event_id is the authoritative dedupe — if
    // we collide on insert, the event was already processed.
    if (eventId) {
        const seen = (await db
            .prepare(
                "SELECT id FROM billing_events WHERE provider_event_id = ?",
            )
            .bind(eventId)
            .first()) as { id: string } | null;
        if (seen) {
            return NextResponse.json({ ok: true, duplicate: true });
        }
    }

    // Record the event BEFORE mutating users — so a partial failure leaves
    // an audit trail.
    try {
        await db
            .prepare(
                `INSERT INTO billing_events
                 (id, user_id, provider_event_id, event_type, tier, active,
                  expires_at, provider_subscription_id, payload)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
                generateUUID(),
                userId,
                eventId,
                eventType,
                nextTier,
                active ? 1 : 0,
                expiresAt,
                providerSubscriptionId,
                rawBody.slice(0, 8000),
            )
            .run();
    } catch (err) {
        // Likely a UNIQUE violation from a concurrent retry — treat as
        // duplicate and ack.
        console.warn(
            "[payouts webhook] billing_events insert failed (likely dupe): %s",
            err instanceof Error ? err.message : String(err),
        );
        return NextResponse.json({ ok: true, duplicate: true });
    }

    // Mirror the tier onto the user row.
    let result: { previousTier: Tier; nextTier: Tier };
    try {
        result = await applyEntitlementUpdate(db, {
            userId,
            tier: nextTier,
            expiresAt,
            providerSubscriptionId,
        });
    } catch (err) {
        console.error(
            "[payouts webhook] tier apply failed for user %s: %s",
            userId,
            err instanceof Error ? err.stack || err.message : String(err),
        );
        // Ack — the event is logged in billing_events for replay.
        return NextResponse.json({ ok: true, deferred: true });
    }

    // Fire the appropriate billing email. Best-effort; mail failures don't
    // block ack.
    try {
        await fireBillingEmail(db, userId, result, expiresAt, data);
    } catch (err) {
        console.error(
            "[payouts webhook] mail dispatch failed for user %s: %s",
            userId,
            err instanceof Error ? err.message : String(err),
        );
    }

    return NextResponse.json({ ok: true });
}

/**
 * Decide which billing email to send based on the tier transition.
 *
 *   hobby → paid    : subscription_activated
 *   paid  → hobby   : subscription_cancelled (period ended / cancelled)
 *   paid  → paid    : silent (renewal or upgrade — Razorpay sends receipts)
 *   anything with data.failed = true → payment_failed
 */
async function fireBillingEmail(
    db: any,
    userId: string,
    result: { previousTier: Tier; nextTier: Tier },
    expiresAt: string | null,
    data: any,
): Promise<void> {
    if (result.previousTier === "internal") return;

    const user = (await db
        .prepare("SELECT email, display_name FROM users WHERE id = ?")
        .bind(userId)
        .first()) as { email: string; display_name: string | null } | null;
    if (!user) return;

    const name = user.display_name || user.email.split("@")[0];
    const planName = humanTierName(
        result.nextTier === "hobby" ? result.previousTier : result.nextTier,
    );
    const manageUrl = "https://accounts.elixpo.com/dashboard/billing";

    // Payment failure signaled by the data envelope (Pay sets failed=true
    // when subscription.halted or repeated failed charges).
    if (data.failed === true || data.status === "halted") {
        await sendMail("billing_payment_failed", user.email, {
            name,
            plan_name: planName,
            update_payment_url: manageUrl,
            grace_until: expiresAt ?? "soon",
        });
        return;
    }

    // Graceful cancel — fire the cancellation email IMMEDIATELY when Pay
    // signals status='cancelled' (still active through period_end). This
    // way the buyer gets confirmation right after clicking Cancel; no
    // second email is sent when the entitlement finally expires (the
    // active=false webhook arrives with the same status flag and we
    // short-circuit on the no-tier-change path).
    if (data.status === "cancelled") {
        await sendMail("billing_subscription_cancelled", user.email, {
            name,
            plan_name: planName,
            access_until: expiresAt ?? "the end of your current period",
            restart_url: "https://accounts.elixpo.com/pricing",
        });
        return;
    }

    // hobby → paid: welcome email.
    if (result.previousTier === "hobby" && result.nextTier !== "hobby") {
        await sendMail("billing_subscription_activated", user.email, {
            name,
            plan_name: planName,
            amount: data.amount ?? "",
            currency: data.currency ?? "INR",
            renews_at: expiresAt ?? "next cycle",
            manage_url: manageUrl,
        });
        return;
    }

    // paid → hobby: cancellation / expiry confirmation.
    if (result.previousTier !== "hobby" && result.nextTier === "hobby") {
        await sendMail("billing_subscription_cancelled", user.email, {
            name,
            plan_name: planName,
            access_until: expiresAt ?? "the end of your current period",
            restart_url: "https://accounts.elixpo.com/pricing",
        });
        return;
    }

    // paid → paid (renewal or upgrade) — stay silent.
}

function humanTierName(t: Tier): string {
    switch (t) {
        case "indie":
            return "Indie";
        case "studio":
            return "Studio";
        case "internal":
            return "Internal";
        default:
            return "Hobby";
    }
}
