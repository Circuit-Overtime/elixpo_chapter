export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { getEnv } from "@/lib/env";
import { fulfillPayment } from "@/lib/fulfill";
import { razorpayFromEnv } from "@/lib/providers/razorpay";
import { getCheckoutSessionByOrder, recordProviderEvent } from "@/lib/repo";

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
