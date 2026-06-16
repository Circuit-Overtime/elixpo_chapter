export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { sha256Hex } from "@/lib/crypto";
import { requireDashboard } from "@/lib/dashboard-auth";

/**
 * POST /api/dashboard/products/:id/regenerate-secret
 *
 * Rotates the app's client secret (1 app = 1 product). The old secret stops
 * working immediately; the new one is returned ONCE. Client ID (slug) is
 * unchanged.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    const app = (await db
        .prepare(
            `SELECT a.id, a.slug FROM products p JOIN apps a ON p.app_id = a.id
             WHERE p.id = ? AND a.merchant_id = ?`,
        )
        .bind(id, merchantId)
        .first()) as { id: string; slug: string } | null;
    if (!app) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const clientSecret = `lix_pay_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const secretHash = await sha256Hex(clientSecret);

    await db
        .prepare("UPDATE apps SET api_key_hash = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(secretHash, app.id)
        .run();

    return NextResponse.json({
        client_id: app.slug,
        client_secret: clientSecret, // shown once
    });
}
