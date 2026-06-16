export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import type { D1Database } from "@cloudflare/workers-types";
import { requireDashboard } from "@/lib/dashboard-auth";
import { newId } from "@/lib/ids";

/**
 * Webhook endpoint management for a product's app (1 app = 1 product).
 *
 *   GET   → current endpoint (url, events, status, masked signing secret)
 *   PUT   → set/replace the destination url  { url }
 *   POST  → rotate the signing secret (returns the new whsec_ ONCE)
 *
 * The signing secret is what the consuming app uses to verify our
 * `entitlement.updated` deliveries. It is shown in full only at creation /
 * rotation time; thereafter the dashboard shows a masked preview.
 */

function genSigningSecret(): string {
    const hex = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    return `whsec_${hex.slice(0, 48)}`;
}

function maskSecret(secret: string | null): string | null {
    if (!secret) return null;
    return `${secret.slice(0, 11)}…${secret.slice(-4)}`;
}

/** Resolve the app behind a product, scoped to the merchant. */
async function appForProduct(
    db: D1Database,
    merchantId: string,
    productId: string,
): Promise<{ id: string; slug: string } | null> {
    return (await db
        .prepare(
            `SELECT a.id, a.slug FROM products p JOIN apps a ON p.app_id = a.id
             WHERE p.id = ? AND a.merchant_id = ?`,
        )
        .bind(productId, merchantId)
        .first()) as { id: string; slug: string } | null;
}

async function getEndpoint(db: D1Database, appId: string): Promise<any | null> {
    return db
        .prepare(
            "SELECT * FROM webhook_endpoints WHERE app_id = ? ORDER BY created_at LIMIT 1",
        )
        .bind(appId)
        .first();
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    const app = await appForProduct(db, merchantId, id);
    if (!app) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const ep = await getEndpoint(db, app.id);
    return NextResponse.json(
        {
            endpoint: ep
                ? {
                      id: ep.id,
                      url: ep.url,
                      events: ep.events,
                      status: ep.status,
                      secret_preview: maskSecret(ep.signing_secret),
                      has_secret: !!ep.signing_secret,
                  }
                : null,
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    const app = await appForProduct(db, merchantId, id);
    if (!app) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const body: any = await request.json().catch(() => ({}));
    const url = String(body.url || "").trim();
    if (!/^https:\/\/.+/i.test(url)) {
        return NextResponse.json(
            { error: "invalid_url", error_description: "A https:// URL is required" },
            { status: 400 },
        );
    }

    const ep = await getEndpoint(db, app.id);
    let secretOnce: string | null = null;
    if (ep) {
        await db
            .prepare("UPDATE webhook_endpoints SET url = ?, status = 'active' WHERE id = ?")
            .bind(url, ep.id)
            .run();
        // Mint a secret if this endpoint somehow never had one.
        if (!ep.signing_secret) {
            secretOnce = genSigningSecret();
            await db
                .prepare("UPDATE webhook_endpoints SET signing_secret = ? WHERE id = ?")
                .bind(secretOnce, ep.id)
                .run();
        }
    } else {
        secretOnce = genSigningSecret();
        await db
            .prepare(
                `INSERT INTO webhook_endpoints (id, app_id, url, secret_ref, signing_secret, events, status)
                 VALUES (?, ?, ?, '', ?, '["entitlement.updated"]', 'active')`,
            )
            .bind(newId("webhookEndpoint"), app.id, url, secretOnce)
            .run();
    }

    return NextResponse.json({ ok: true, url, signing_secret: secretOnce });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    const app = await appForProduct(db, merchantId, id);
    if (!app) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const secret = genSigningSecret();
    const ep = await getEndpoint(db, app.id);
    if (ep) {
        await db
            .prepare("UPDATE webhook_endpoints SET signing_secret = ? WHERE id = ?")
            .bind(secret, ep.id)
            .run();
    } else {
        return NextResponse.json(
            { error: "no_endpoint", error_description: "Set a webhook URL first." },
            { status: 400 },
        );
    }

    return NextResponse.json({ signing_secret: secret });
}
