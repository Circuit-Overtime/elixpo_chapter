export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { requireDashboard } from "@/lib/dashboard-auth";
import { newId } from "@/lib/ids";

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const INTERVALS = ["day", "week", "month", "year"];

/** POST /api/dashboard/prices — add a price (regional/PPP variant) to a product. */
export async function POST(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;

    const body: any = await request.json().catch(() => ({}));
    const productId = String(body.product_id || "");
    const currency = String(body.currency || "").toUpperCase();
    const unitAmount = Number(body.unit_amount);
    const interval = String(body.interval || "month");
    const intervalCount = Math.max(1, Number(body.interval_count || 1));
    const region = body.region ? String(body.region).toUpperCase().slice(0, 2) : null;
    const nickname = body.nickname ? String(body.nickname).trim().slice(0, 40) : null;

    if (!productId || !CURRENCIES.includes(currency)) {
        return NextResponse.json({ error: "invalid_currency" }, { status: 400 });
    }
    if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
        return NextResponse.json(
            { error: "invalid_amount", error_description: "unit_amount must be a positive integer (minor units)" },
            { status: 400 },
        );
    }
    if (!INTERVALS.includes(interval)) {
        return NextResponse.json({ error: "invalid_interval" }, { status: 400 });
    }

    // Ownership: product -> app -> merchant.
    const owns = await db
        .prepare(
            `SELECT 1 FROM products p JOIN apps a ON p.app_id = a.id
             WHERE p.id = ? AND a.merchant_id = ?`,
        )
        .bind(productId, merchantId)
        .first();
    if (!owns) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const id = newId("price");
    await db
        .prepare(
            `INSERT INTO prices (id, product_id, nickname, currency, unit_amount, type, interval, interval_count, region, provider, active)
             VALUES (?, ?, ?, ?, ?, 'one_time', ?, ?, ?, 'razorpay', 1)`,
        )
        .bind(id, productId, nickname, currency, unitAmount, interval, intervalCount, region)
        .run();

    return NextResponse.json({
        price: {
            id,
            product_id: productId,
            nickname,
            currency,
            unit_amount: unitAmount,
            interval,
            interval_count: intervalCount,
            region,
            active: 1,
        },
    });
}
