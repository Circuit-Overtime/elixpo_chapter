export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { getEnv, requireEnv } from "@/lib/env";
import { verifyHandoff } from "@/lib/handoff";
import { razorpayFromEnv } from "@/lib/providers/razorpay";
import {
    createCheckoutSession,
    getAppBySlug,
    resolveProductAndPrice,
    setSessionOrder,
    upsertCustomer,
} from "@/lib/repo";

/**
 * POST /api/checkout/session
 *
 * Body: { token: "<handoff token>" }
 *
 * Verifies the signed handoff from the consuming app, creates a checkout
 * session + a Razorpay order, and returns what the hosted /checkout page needs
 * to open Razorpay Checkout. The handoff token is the ONLY trusted source for
 * amount/uid — loose query params are never used for money.
 */
export async function POST(request: NextRequest) {
    try {
        const body: any = await request.json().catch(() => ({}));
        const token: string | undefined = body.token;
        if (!token) {
            return NextResponse.json(
                { error: "invalid_request", error_description: "token is required" },
                { status: 400 },
            );
        }

        const secret = await requireEnv("ELIXPO_PAY_HANDOFF_SECRET");
        const result = await verifyHandoff(secret, token);
        if (!result.ok) {
            return NextResponse.json(
                { error: "invalid_token", error_description: result.error },
                { status: 401 },
            );
        }
        const p = result.payload;

        const db = await getDatabase();
        const app = await getAppBySlug(db, p.app);
        if (!app) {
            return NextResponse.json(
                { error: "unknown_app", error_description: `No app '${p.app}'` },
                { status: 404 },
            );
        }

        const resolved = await resolveProductAndPrice(
            db,
            app.id,
            p.plan,
            p.currency,
        );
        if (!resolved) {
            return NextResponse.json(
                {
                    error: "unknown_plan",
                    error_description: `No product for tier '${p.plan}'`,
                },
                { status: 404 },
            );
        }

        // Amount comes from the signed token; warn (but trust token) if the
        // catalog price disagrees, so we can reconcile mispriced handoffs.
        const amount = p.amount;
        if (resolved.price && resolved.price.unit_amount !== amount) {
            console.warn(
                `[checkout] amount mismatch app=${p.app} token=${amount} price=${resolved.price.unit_amount}`,
            );
        }

        const customerId = await upsertCustomer(db, app.id, p.uid, p.email);

        const sessionId = await createCheckoutSession(db, {
            appId: app.id,
            customerId,
            externalUid: p.uid,
            productId: resolved.product.id,
            priceId: resolved.price?.id ?? null,
            currency: p.currency,
            amount,
            returnUrl: p.return ?? app.return_url,
            metadata: { plan: p.plan, source: "handoff" },
        });

        const razorpay = await razorpayFromEnv(getEnv);
        if (!razorpay) {
            // Test payment mode: outside production, let checkout complete without
            // a real provider so the full handoff -> grant -> entitlement loop can
            // be exercised before Razorpay/Stripe bank accounts are connected.
            const environment = await getEnv("ENVIRONMENT");
            if (environment !== "production") {
                return NextResponse.json({
                    session_id: sessionId,
                    provider: "test",
                    test_mode: true,
                    amount,
                    currency: p.currency,
                    product_name: resolved.product.name,
                    tier: resolved.product.tier,
                    prefill: { email: p.email ?? "" },
                    return_url: p.return ?? app.return_url,
                });
            }
            return NextResponse.json(
                {
                    error: "provider_unconfigured",
                    error_description:
                        "Razorpay keys are not set on the server (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).",
                },
                { status: 503 },
            );
        }

        const order = await razorpay.createOrder({
            amount,
            currency: p.currency,
            receipt: sessionId,
            notes: { app: p.app, uid: p.uid, tier: p.plan },
        });

        await setSessionOrder(db, sessionId, order.providerOrderId);

        return NextResponse.json({
            session_id: sessionId,
            provider: "razorpay",
            key_id: await getEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID"),
            order_id: order.providerOrderId,
            amount,
            currency: p.currency,
            product_name: resolved.product.name,
            tier: resolved.product.tier,
            prefill: { email: p.email ?? "" },
            return_url: p.return ?? app.return_url,
        });
    } catch (err: any) {
        console.error("[checkout/session] error:", err);
        return NextResponse.json(
            { error: "server_error", error_description: String(err?.message || err) },
            { status: 500 },
        );
    }
}
