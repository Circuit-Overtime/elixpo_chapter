export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import type { D1Database } from "@cloudflare/workers-types";
import { requireDashboard } from "@/lib/dashboard-auth";

async function ownsPrice(
    db: D1Database,
    merchantId: string,
    priceId: string,
): Promise<boolean> {
    const row = await db
        .prepare(
            `SELECT 1 FROM prices pr
             JOIN products p ON pr.product_id = p.id
             JOIN apps a ON p.app_id = a.id
             WHERE pr.id = ? AND a.merchant_id = ?`,
        )
        .bind(priceId, merchantId)
        .first();
    return !!row;
}

/** PATCH /api/dashboard/prices/:id — toggle active or update amount. */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    if (!(await ownsPrice(db, merchantId, id))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body: any = await request.json().catch(() => ({}));
    const sets: string[] = [];
    const vals: any[] = [];
    if (body.active !== undefined) {
        sets.push("active = ?");
        vals.push(body.active ? 1 : 0);
    }
    if (body.unit_amount !== undefined) {
        const n = Number(body.unit_amount);
        if (!Number.isInteger(n) || n <= 0) {
            return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
        }
        sets.push("unit_amount = ?");
        vals.push(n);
    }
    if (!sets.length) {
        return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }
    vals.push(id);
    await db
        .prepare(`UPDATE prices SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...vals)
        .run();

    return NextResponse.json({ ok: true });
}

/** DELETE /api/dashboard/prices/:id — deactivate. */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    const { id } = await params;

    if (!(await ownsPrice(db, merchantId, id))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await db
        .prepare("UPDATE prices SET active = 0 WHERE id = ?")
        .bind(id)
        .run();
    return NextResponse.json({ ok: true });
}
