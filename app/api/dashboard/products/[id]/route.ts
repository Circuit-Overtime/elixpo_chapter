export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import type { D1Database } from "@cloudflare/workers-types";
import { requireDashboard } from "@/lib/dashboard-auth";

async function ownsProduct(
    db: D1Database,
    merchantId: string,
    productId: string,
): Promise<boolean> {
    const row = await db
        .prepare(
            `SELECT 1 FROM products p JOIN apps a ON p.app_id = a.id
             WHERE p.id = ? AND a.merchant_id = ?`,
        )
        .bind(productId, merchantId)
        .first();
    return !!row;
}

/** GET /api/dashboard/products/:id — product + tiers + stats (1 app = 1 product). */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    const product = (await db
        .prepare(
            `SELECT p.id, p.app_id, p.name, p.tier, p.description, p.active,
                    a.slug AS client_id, a.name AS app_name, a.homepage_url, a.pricing_url
             FROM products p JOIN apps a ON p.app_id = a.id
             WHERE p.id = ? AND a.merchant_id = ?`,
        )
        .bind(id, merchantId)
        .first()) as any;
    if (!product) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const prices = await db
        .prepare(
            `SELECT id, nickname, currency, unit_amount, type, interval, interval_count, region, active
             FROM prices WHERE product_id = ? ORDER BY active DESC, unit_amount`,
        )
        .bind(id)
        .all();

    const appId = product.app_id;
    const counts = (await db
        .prepare(
            `SELECT
               (SELECT COUNT(*) FROM transactions t WHERE t.app_id = ?1 AND t.status = 'captured') AS paid,
               (SELECT COUNT(*) FROM entitlements e WHERE e.app_id = ?1 AND e.status = 'active'
                  AND (e.expires_at IS NULL OR e.expires_at > datetime('now'))) AS active_members`,
        )
        .bind(appId)
        .first()) as any;

    const revenue = await db
        .prepare(
            `SELECT currency, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
             FROM transactions WHERE app_id = ? AND status = 'captured' GROUP BY currency`,
        )
        .bind(appId)
        .all();

    return NextResponse.json(
        {
            product,
            prices: prices.results ?? [],
            stats: {
                paidTransactions: counts?.paid ?? 0,
                activeMembers: counts?.active_members ?? 0,
                revenue: revenue.results ?? [],
            },
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}

/** PATCH /api/dashboard/products/:id — update name/description/active. */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    if (!(await ownsProduct(db, merchantId, id))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body: any = await request.json().catch(() => ({}));
    const sets: string[] = [];
    const vals: any[] = [];
    if (body.name !== undefined) {
        sets.push("name = ?");
        vals.push(String(body.name).trim());
    }
    if (body.description !== undefined) {
        sets.push("description = ?");
        vals.push(body.description ? String(body.description).trim() : null);
    }
    if (body.active !== undefined) {
        sets.push("active = ?");
        vals.push(body.active ? 1 : 0);
    }
    if (!sets.length) {
        return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }
    vals.push(id);
    await db
        .prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...vals)
        .run();

    return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/dashboard/products/:id — archive (soft-delete) the product.
 * Deactivates the product only (prices keep their state) so it can be cleanly
 * un-archived later via PATCH { active: true }. While archived, checkout can't
 * resolve it and the catalog omits it — i.e. payments are paused.
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    if (!(await ownsProduct(db, merchantId, id))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await db
        .prepare("UPDATE products SET active = 0 WHERE id = ?")
        .bind(id)
        .run();
    return NextResponse.json({ ok: true });
}
