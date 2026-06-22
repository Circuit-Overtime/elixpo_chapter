export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { getEnv } from "@/lib/env";
import { fulfillPayment } from "@/lib/fulfill";
import { razorpayFromEnv } from "@/lib/providers/razorpay";
import {
    getCheckoutSessionByOrder,
    getCheckoutSessionBySubscription,
    getSubscriptionByProviderId,
    recordProviderEvent,
    upsertRecurringSubscription,
} from "@/lib/repo";

/**
 * POST /api/webhooks/razorpay
 *
 * Authoritative fulfillment. Verifies X-Razorpay-Signature over the RAW body,
 * de-dups on the provider event id, and fulfills `payment.captured`. Always
 * returns 200 on signature-valid events so Razorpay stops retrying — internal
 * errors are logged, not surfaced as retriable.
 */
export async function POST(request: NextRequest) {
    let rawBody: string;
    try {
        rawBody = await request.text();
    } catch {
        return NextResponse.json({ error: "bad_body" }, { status: 400 });
    }

    const signature = request.headers.get("x-razorpay-signature") || "";

    const razorpay = await razorpayFromEnv(getEnv);
    if (!razorpay) {
        console.error("[webhook/razorpay] provider unconfigured");
        return NextResponse.json(
            { error: "provider_unconfigured" },
            { status: 503 },
        );
    }

    const valid = await razorpay.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
        return NextResponse.json(
            { error: "invalid_signature" },
            { status: 401 },
        );
    }

    let event: any;
    try {
        event = razorpay.parseWebhook(rawBody, request.headers);
    } catch (err) {
        console.error("[webhook/razorpay] parse error:", err);
        return NextResponse.json({ ok: true, ignored: "parse_error" });
    }

    try {
        const db = await getDatabase();

        // Replay guard.
        const seen = await recordProviderEvent(
            db,
            "razorpay",
            event.eventId,
            event.type,
            rawBody,
        );
        if (seen.alreadySeen) {
            return NextResponse.json({ ok: true, duplicate: true });
        }

        // ── Subscription lifecycle events ────────────────────────────
        // Note: subscription.charged ALSO has isPaymentCaptured=true
        // (it carries a payment.entity), so we handle it first to ensure
        // the recurring-fulfillment path runs — extending entitlement,
        // writing a ledger row, and firing the outbound webhook for each
        // renewal charge, not just the first one.
        if (event.providerSubscriptionId) {
            const subResult = await handleSubscriptionEvent(db, event);
            if (subResult) return subResult;
        }

        if (!event.isPaymentCaptured) {
            return NextResponse.json({ ok: true, ignored: event.type });
        }

        if (!event.providerOrderId) {
            return NextResponse.json({ ok: true, ignored: "no_order_id" });
        }

        const session = await getCheckoutSessionByOrder(
            db,
            event.providerOrderId,
        );
        if (!session) {
            console.warn(
                `[webhook/razorpay] no session for order ${event.providerOrderId}`,
            );
            return NextResponse.json({ ok: true, ignored: "no_session" });
        }

        const appSlug = (await db
            .prepare("SELECT slug FROM apps WHERE id = ?")
            .bind(session.app_id)
            .first()) as { slug: string } | null;

        await fulfillPayment(db, {
            session,
            appSlug: appSlug?.slug ?? "",
            providerOrderId: event.providerOrderId,
            providerPaymentId: event.providerPaymentId ?? "",
            amount: event.amount ?? session.amount,
            currency: event.currency ?? session.currency,
            raw: event.raw,
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        // Signature was valid; swallow internal errors so Razorpay doesn't
        // hammer retries. Surfaced in logs / delivery records for replay.
        console.error("[webhook/razorpay] fulfillment error:", err);
        return NextResponse.json({ ok: true, deferred: true });
    }
}

/**
 * Handle subscription.* events. Returns a NextResponse to short-circuit the
 * main handler when this event is purely a sub lifecycle event (no payment).
 * Returns null when the event ALSO carries a payment.captured (i.e.
 * subscription.charged) so the main handler can run `fulfillPayment` to
 * extend the entitlement, write a ledger row, and fire outbound webhooks.
 *
 * Event semantics (Razorpay):
 *  - subscription.activated  → first mandate accepted. The actual charge
 *                              arrives separately as subscription.charged
 *                              (or payment.captured carrying subscription_id).
 *  - subscription.charged    → recurring charge succeeded. Falls through to
 *                              fulfillPayment which is idempotent + extends
 *                              the period.
 *  - subscription.paused     → mandate paused. Existing entitlement keeps
 *                              its current period; no further charges
 *                              until resumed.
 *  - subscription.cancelled  → buyer/merchant cancelled. Entitlement is
 *                              left in place until period_end (graceful)
 *                              and the cron expiry takes over.
 *  - subscription.halted     → too many failures; buyer needs to update
 *                              payment method. Entitlement stays active
 *                              through the period they paid for.
 *  - subscription.completed  → ran through `total_count` cycles. Same
 *                              graceful expiry as cancelled.
 */
async function handleSubscriptionEvent(
    db: D1Database,
    event: any,
): Promise<NextResponse | null> {
    const providerSubId = event.providerSubscriptionId as string;
    const status = event.subscriptionStatus as string | null;

    // Resolve the subscription row + the session (for tier/app context).
    const subRow = await getSubscriptionByProviderId(db, providerSubId);
    const session = await getCheckoutSessionBySubscription(db, providerSubId);

    // Update DB status for non-charge events. `charged` falls through to
    // the main fulfillment path which writes status='active' via the
    // upsert in fulfillPayment.
    if (status && status !== "charged") {
        const dbStatus = mapSubStatus(status);
        if (subRow) {
            await db
                .prepare(
                    `UPDATE subscriptions
                     SET status = ?,
                         cancel_at = CASE WHEN ? IN ('cancelled','completed') THEN datetime('now') ELSE cancel_at END,
                         updated_at = datetime('now')
                     WHERE id = ?`,
                )
                .bind(dbStatus, dbStatus, subRow.id)
                .run();
        }
    }

    // subscription.activated arrives with no payment.entity. The first
    // charge comes as a separate subscription.charged / payment.captured
    // event, so there's nothing to fulfill here — just acknowledge.
    if (status === "activated") {
        // Idempotent: subscription row may already be 'pending' from the
        // checkout-session creation. Flip it to 'active' but don't roll
        // the period until the charged event.
        if (session) {
            await upsertRecurringSubscription(db, {
                appId: session.app_id,
                customerId: session.customer_id,
                productId: session.product_id,
                priceId: session.price_id,
                tier: deriveTier(session),
                providerSubscriptionId: providerSubId,
                status: "active",
            });
        }
        return NextResponse.json({ ok: true, subscription: "activated" });
    }

    // Charge → defer to main handler. It calls fulfillPayment which
    // upserts the subscription, extends entitlement, writes ledger, fires
    // outbound webhooks. Returning null lets that path run.
    if (status === "charged") {
        return null;
    }

    // Non-charge non-activated event (paused/cancelled/halted/completed).
    // Status already updated above; nothing else to do.
    return NextResponse.json({
        ok: true,
        subscription: status ?? "unknown",
    });
}

function mapSubStatus(razorpayStatus: string): string {
    switch (razorpayStatus) {
        case "activated":
            return "active";
        case "paused":
            return "past_due";
        case "halted":
            return "past_due";
        case "cancelled":
            return "cancelled";
        case "completed":
            return "expired";
        default:
            return razorpayStatus;
    }
}

function deriveTier(session: any): string {
    // Fallback: 'member'. The proper tier is on the product row but we
    // don't want a synchronous join here in the webhook hot path; the
    // upsert keys on provider_subscription_id so the row already exists
    // with the correct tier from checkout-session creation.
    const meta = (() => {
        try {
            return session.metadata ? JSON.parse(session.metadata) : {};
        } catch {
            return {};
        }
    })();
    return meta.plan || meta.tier || "member";
}
