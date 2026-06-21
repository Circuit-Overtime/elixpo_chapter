export const runtime = "edge";

import { getDatabase } from "@/lib/d1-client";
import { getEnv } from "@/lib/env";
import { verifyHandoff } from "@/lib/handoff";
import { razorpayFromEnv } from "@/lib/providers/razorpay";
import {
    createCheckoutSession,
    getAppBySlug,
    getCheckoutSession,
    resolveProductAndPrice,
    setSessionOrder,
    upsertCustomer,
} from "@/lib/repo";
import type { D1Database } from "@cloudflare/workers-types";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/checkout/session
 *
 * Called by the hosted /checkout page to hydrate the order. The session is
 * created ahead of time by the consuming app via POST /v1/checkout/sessions, so
 * the page passes back only the opaque session id:
 *
 *   Body: { session_id: "cs_…" }
 *
 * We load the session, resolve its product/price, lazily create the Razorpay
 * order (close to payment, so abandoned sessions never mint orders), and return
 * what Razorpay Checkout needs.
 *
 * Legacy: { token } is still accepted while older callers migrate off the
 * signed-handoff flow — it verifies the token, materialises a session, then
 * finalises it the same way. Remove once no caller sends `token`.
 */
export async function POST(request: NextRequest) {
    try {
        const body: any = await request.json().catch(() => ({}));
        const db = await getDatabase();

        let sessionId: string | undefined = body.session_id;

        // ── Legacy handoff-token path ───────────────────────────────────────
        if (!sessionId && body.token) {
            const legacy = await materialiseFromToken(db, body.token);
            if (legacy instanceof NextResponse) return legacy;
            sessionId = legacy;
        }

        if (!sessionId) {
            return NextResponse.json(
                {
                    error: "invalid_request",
                    error_description: "session_id is required",
                },
                { status: 400 },
            );
        }

        const session = (await getCheckoutSession(db, sessionId)) as any;
        if (!session) {
            return NextResponse.json(
                {
                    error: "unknown_session",
                    error_description: "No such checkout session",
                },
                { status: 404 },
            );
        }
        if (session.status === "completed") {
            return NextResponse.json(
                {
                    error: "session_completed",
                    error_description: "This checkout is already paid.",
                },
                { status: 409 },
            );
        }
        if (
            session.expires_at &&
            new Date(`${session.expires_at.replace(" ", "T")}Z`) < new Date()
        ) {
            return NextResponse.json(
                {
                    error: "session_expired",
                    error_description: "This checkout link has expired.",
                },
                { status: 410 },
            );
        }

        return await finalizeSession(db, session);
    } catch (err: any) {
        console.error("[checkout/session] error:", err);
        return NextResponse.json(
            {
                error: "server_error",
                error_description: String(err?.message || err),
            },
            { status: 500 },
        );
    }
}

/**
 * Build the order details for a session, lazily creating the Razorpay order,
 * and return the JSON the hosted checkout page consumes.
 */
async function finalizeSession(
    db: D1Database,
    session: any,
): Promise<NextResponse> {
    const app = (await db
        .prepare("SELECT id, slug, name, return_url FROM apps WHERE id = ?")
        .bind(session.app_id)
        .first()) as any;

    const product = session.product_id
        ? ((await db
              .prepare("SELECT name, tier FROM products WHERE id = ?")
              .bind(session.product_id)
              .first()) as any)
        : null;
    const price = session.price_id
        ? ((await db
              .prepare(
                  "SELECT interval, interval_count FROM prices WHERE id = ?",
              )
              .bind(session.price_id)
              .first()) as any)
        : null;
    const customer = session.customer_id
        ? ((await db
              .prepare("SELECT email FROM customers WHERE id = ?")
              .bind(session.customer_id)
              .first()) as any)
        : null;

    const meta = parseMeta(session.metadata);

    const details = {
        amount: session.amount,
        currency: session.currency,
        product_name: product?.name ?? "Membership",
        tier: product?.tier ?? meta.plan ?? "member",
        app: app?.slug,
        app_name: app?.name,
        interval: price?.interval ?? "month",
        interval_count: price?.interval_count ?? 1,
        prefill: { email: customer?.email ?? "" },
        return_url: session.return_url ?? app?.return_url ?? null,
    };

    const razorpay = await razorpayFromEnv(getEnv);
    if (!razorpay) {
        // Test payment mode: outside production, complete without a real provider
        // so the full session -> grant -> entitlement loop can be exercised before
        // Razorpay/Stripe bank accounts are connected.
        const environment = await getEnv("ENVIRONMENT");
        if (environment !== "production") {
            return NextResponse.json({
                session_id: session.id,
                provider: "test",
                test_mode: true,
                ...details,
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

    // Reuse the order if this session already minted one (page reload / retry).
    let orderId: string | undefined = session.provider_order_id || undefined;
    if (!orderId) {
        const order = await razorpay.createOrder({
            amount: session.amount,
            currency: session.currency,
            receipt: session.id,
            notes: {
                app: app?.slug,
                uid: session.external_uid,
                tier: details.tier,
            },
        });
        orderId = order.providerOrderId;
        await setSessionOrder(db, session.id, orderId);
    }

    return NextResponse.json({
        session_id: session.id,
        provider: "razorpay",
        mode: razorpay.mode,
        key_id: razorpay.keyId,
        order_id: orderId,
        ...details,
    });
}

/**
 * Legacy: verify a signed handoff token and materialise a checkout session from
 * it, returning the new session id. Mirrors the pre-API flow.
 */
async function materialiseFromToken(
    db: D1Database,
    token: string,
): Promise<string | NextResponse> {
    const secret = await getEnv("ELIXPO_PAY_HANDOFF_SECRET");
    if (!secret) {
        return NextResponse.json(
            {
                error: "legacy_disabled",
                error_description: "Handoff tokens are no longer accepted.",
            },
            { status: 410 },
        );
    }
    const result = await verifyHandoff(secret, token);
    if (!result.ok) {
        return NextResponse.json(
            { error: "invalid_token", error_description: result.error },
            { status: 401 },
        );
    }
    const p = result.payload;

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

    const customerId = await upsertCustomer(db, app.id, p.uid, p.email);
    return createCheckoutSession(db, {
        appId: app.id,
        customerId,
        externalUid: p.uid,
        productId: resolved.product.id,
        priceId: resolved.price?.id ?? null,
        currency: p.currency,
        amount: p.amount,
        returnUrl: p.return ?? app.return_url,
        metadata: { plan: p.plan, source: "handoff" },
    });
}

function parseMeta(raw: unknown): Record<string, any> {
    if (!raw || typeof raw !== "string") return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}
