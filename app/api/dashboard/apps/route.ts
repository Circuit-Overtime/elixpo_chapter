export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { sha256Hex } from "@/lib/crypto";
import { requireDashboard } from "@/lib/dashboard-auth";
import { newId } from "@/lib/ids";

/** GET /api/dashboard/apps — list the merchant's apps. */
export async function GET(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;

    const apps = await db
        .prepare(
            `SELECT a.id, a.slug, a.name, a.return_url, a.status, a.created_at,
                    (a.api_key_hash IS NOT NULL) AS has_key,
                    (SELECT COUNT(*) FROM products p WHERE p.app_id = a.id AND p.active = 1) AS products
             FROM apps a WHERE a.merchant_id = ? ORDER BY a.created_at`,
        )
        .bind(merchantId)
        .all();

    return NextResponse.json({ apps: apps.results ?? [] });
}

/** POST /api/dashboard/apps — create an app; returns the secret key ONCE. */
export async function POST(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;

    const body: any = await request.json().catch(() => ({}));
    const slug = String(body.slug || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const returnUrl = body.return_url ? String(body.return_url).trim() : null;

    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) {
        return NextResponse.json(
            { error: "invalid_slug", error_description: "3-40 chars, a-z 0-9 and hyphens" },
            { status: 400 },
        );
    }
    if (name.length < 2) {
        return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    }

    const dup = await db
        .prepare("SELECT 1 FROM apps WHERE slug = ?")
        .bind(slug)
        .first();
    if (dup) {
        return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }

    const apiKey = `pay_sk_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const apiKeyHash = await sha256Hex(apiKey);
    const id = newId("app");

    await db
        .prepare(
            "INSERT INTO apps (id, merchant_id, slug, name, api_key_hash, return_url, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
        )
        .bind(id, merchantId, slug, name, apiKeyHash, returnUrl)
        .run();

    return NextResponse.json({
        app: { id, slug, name, return_url: returnUrl },
        api_key: apiKey, // shown once
    });
}
