export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { sha256Hex, timingSafeEqual } from "@/lib/crypto";
import { getDatabase } from "@/lib/d1-client";
import { newId } from "@/lib/ids";
import type { D1Database } from "@cloudflare/workers-types";

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const INTERVALS = ["day", "week", "month", "year"];

/** Resolve the app from its secret key (Bearer / X-Elixpo-Pay-Key). */
async function appFromKey(db: D1Database, request: NextRequest): Promise<any | null> {
    const auth = request.headers.get("authorization");
    const key = auth?.startsWith("Bearer ")
        ? auth.slice(7)
        : request.headers.get("x-elixpo-pay-key");
    if (!key) return null;
    const hash = await sha256Hex(key);
    // Look up by hash; compare in constant time as a belt-and-suspenders guard.
    const app = (await db
        .prepare("SELECT * FROM apps WHERE api_key_hash = ? AND status = 'active'")
        .bind(hash)
        .first()) as any;
    if (!app || !app.api_key_hash || !timingSafeEqual(hash, app.api_key_hash)) {
        return null;
    }
    return app;
}

const priceKey = (currency: string, region: string | null, interval: string) =>
    `${currency}|${region || ""}|${interval}`;

/**
 * POST /v1/products
 *
 * Sync a product and its pricing tiers from the consuming app (e.g. blogs
 * pushing its member tiers). Authenticated by the app's secret key. Upserts the
 * product by tier and reconciles its prices: matching (currency, region,
 * interval) are updated, new ones inserted, and active prices not in the
 * payload are deactivated.
 *
 * Body:
 * {
 *   "product": { "tier": "member", "name": "Blogs Member", "description": "..." },
 *   "tiers": [
 *     { "nickname": "India", "currency": "INR", "unit_amount": 19900, "interval": "month", "interval_count": 1, "region": "IN" },
 *     { "nickname": "Global", "currency": "USD", "unit_amount": 600, "interval": "month" }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const db = await getDatabase();
        const app = await appFromKey(db, request);
        if (!app) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }

        const body: any = await request.json().catch(() => ({}));
        const prod = body.product || {};
        const tier = String(prod.tier || "").trim().toLowerCase();
        if (!/^[a-z0-9_]{2,32}$/.test(tier)) {
            return NextResponse.json(
                { error: "invalid_tier", error_description: "product.tier required (a-z 0-9 _)" },
                { status: 400 },
            );
        }
        const name = String(prod.name || tier).trim().slice(0, 80);
        const description = prod.description ? String(prod.description).trim().slice(0, 280) : null;
        const tiers: any[] = Array.isArray(body.tiers) ? body.tiers : [];

        // 1. Upsert the product by (app, tier).
        const existingProduct = (await db
            .prepare("SELECT id FROM products WHERE app_id = ? AND tier = ?")
            .bind(app.id, tier)
            .first()) as { id: string } | null;

        let productId: string;
        if (existingProduct) {
            productId = existingProduct.id;
            await db
                .prepare("UPDATE products SET name = ?, description = ?, active = 1 WHERE id = ?")
                .bind(name, description, productId)
                .run();
        } else {
            productId = newId("product");
            await db
                .prepare("INSERT INTO products (id, app_id, name, tier, description, active) VALUES (?, ?, ?, ?, ?, 1)")
                .bind(productId, app.id, name, tier, description)
                .run();
        }

        // 2. Reconcile prices.
        const existing = ((await db
            .prepare("SELECT id, currency, region, interval, active FROM prices WHERE product_id = ?")
            .bind(productId)
            .all()).results ?? []) as any[];

        const seen = new Set<string>();
        const out: any[] = [];

        for (const t of tiers) {
            const currency = String(t.currency || "").toUpperCase();
            const unit = Number(t.unit_amount);
            const interval = INTERVALS.includes(t.interval) ? t.interval : "month";
            const intervalCount = Math.max(1, Number(t.interval_count || 1));
            const region = t.region ? String(t.region).toUpperCase().slice(0, 2) : null;
            const nickname = t.nickname ? String(t.nickname).trim().slice(0, 40) : null;
            if (!CURRENCIES.includes(currency) || !Number.isInteger(unit) || unit <= 0) {
                continue; // skip invalid tier rows
            }
            const k = priceKey(currency, region, interval);
            seen.add(k);
            const match = existing.find((e) => priceKey(e.currency, e.region, e.interval) === k);
            if (match) {
                await db
                    .prepare("UPDATE prices SET unit_amount = ?, nickname = ?, interval_count = ?, active = 1 WHERE id = ?")
                    .bind(unit, nickname, intervalCount, match.id)
                    .run();
                out.push({ id: match.id, currency, unit_amount: unit, interval, region, updated: true });
            } else {
                const pid = newId("price");
                await db
                    .prepare(
                        `INSERT INTO prices (id, product_id, nickname, currency, unit_amount, type, interval, interval_count, region, provider, active)
                         VALUES (?, ?, ?, ?, ?, 'one_time', ?, ?, ?, 'razorpay', 1)`,
                    )
                    .bind(pid, productId, nickname, currency, unit, interval, intervalCount, region)
                    .run();
                out.push({ id: pid, currency, unit_amount: unit, interval, region, created: true });
            }
        }

        // 3. Deactivate active prices not present in the payload.
        for (const e of existing) {
            if (e.active && !seen.has(priceKey(e.currency, e.region, e.interval))) {
                await db.prepare("UPDATE prices SET active = 0 WHERE id = ?").bind(e.id).run();
            }
        }

        return NextResponse.json({
            ok: true,
            app: app.slug,
            product: { id: productId, name, tier, description },
            tiers: out,
        });
    } catch (err: any) {
        console.error("[v1/products] error:", err);
        return NextResponse.json({ error: "server_error", error_description: String(err?.message || err) }, { status: 500 });
    }
}
