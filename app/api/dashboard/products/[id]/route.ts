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
                    a.slug AS client_id, a.name AS app_name, a.homepage_url, a.pricing_url,
                    a.prev_slug, a.prev_slug_expires_at, a.prev_api_key_expires_at
             FROM products p JOIN apps a ON p.app_id = a.id
             WHERE p.id = ? AND a.merchant_id = ?`,
        )
        .bind(id, merchantId)
        .first()) as any;
    if (!product) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const appId = product.app_id;

    // All tiers of this app (the app IS the product; each products-row is a tier).
    const tierRows = ((
        await db
            .prepare(
                `SELECT id, name, tier, description, active
                 FROM products WHERE app_id = ? ORDER BY active DESC, created_at`,
            )
            .bind(appId)
            .all()
    ).results ?? []) as any[];

    const allPrices = ((
        await db
            .prepare(
                `SELECT pr.id, pr.product_id, pr.nickname, pr.currency, pr.unit_amount, pr.type,
                        pr.interval, pr.interval_count, pr.region, pr.active
                 FROM prices pr JOIN products p ON pr.product_id = p.id
                 WHERE p.app_id = ? ORDER BY pr.active DESC, pr.unit_amount`,
            )
            .bind(appId)
            .all()
    ).results ?? []) as any[];

    const pricesByTier: Record<string, any[]> = {};
    for (const pr of allPrices) (pricesByTier[pr.product_id] ||= []).push(pr);
    const tiers = tierRows.map((t) => ({ ...t, prices: pricesByTier[t.id] ?? [] }));

    // The representative product's own prices (kept for backward compatibility).
    const prices = pricesByTier[id] ?? [];
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
            tiers,
            prices,
            stats: {
                paidTransactions: counts?.paid ?? 0,
                activeMembers: counts?.active_members ?? 0,
                revenue: revenue.results ?? [],
            },
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}

/**
 * PATCH /api/dashboard/products/:id
 *   { app_name }    — rename the app (the "product" title)
 *   { name, description } — update this tier (products-row)
 *   { active }      — archive/unarchive the WHOLE app (all its tiers)
 */
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
    let touched = false;

    // App-level: rename the app (shown as the product title).
    if (body.app_name !== undefined) {
        await db
            .prepare(
                `UPDATE apps SET name = ?, updated_at = datetime('now')
                 WHERE id = (SELECT app_id FROM products WHERE id = ?)`,
            )
            .bind(String(body.app_name).trim().slice(0, 80), id)
            .run();
        touched = true;
    }

    // App-level: archive / unarchive every tier of the app at once.
    if (body.active !== undefined) {
        await db
            .prepare(
                `UPDATE products SET active = ?
                 WHERE app_id = (SELECT app_id FROM products WHERE id = ?)`,
            )
            .bind(body.active ? 1 : 0, id)
            .run();
        touched = true;
    }

    // Tier-level: this products-row's own name/description.
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
    if (sets.length) {
        vals.push(id);
        await db.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`).bind(...vals).run();
        touched = true;
    }

    if (!touched) {
        return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/dashboard/products/:id — archive the whole app (all tiers).
 * Deactivates every products-row of the app (prices keep their state) so it can
 * be cleanly un-archived via PATCH { active: true }. While archived, checkout
 * can't resolve any tier and the catalog omits them — i.e. payments are paused.
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
        .prepare(
            `UPDATE products SET active = 0
             WHERE app_id = (SELECT app_id FROM products WHERE id = ?)`,
        )
        .bind(id)
        .run();
    return NextResponse.json({ ok: true });
}
