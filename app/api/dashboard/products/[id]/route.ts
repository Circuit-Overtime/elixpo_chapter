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

/** DELETE /api/dashboard/products/:id — soft-delete (deactivate). */
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
    await db
        .prepare("UPDATE prices SET active = 0 WHERE product_id = ?")
        .bind(id)
        .run();
    return NextResponse.json({ ok: true });
}
