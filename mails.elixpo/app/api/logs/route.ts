export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { deliveryStats, listDeliveries } from "@/lib/deliveries";
import { getDatabase } from "@/lib/d1-client";
import { getSession } from "@/lib/session";

/**
 * GET /api/logs — delivery logs for the dashboard, newest first.
 * Query: ?productId= &templateId= &status=sent|failed|sending &limit= &before=
 * Also returns aggregate counts (optionally scoped to the product filter).
 */
export async function GET(request: NextRequest) {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const productId = sp.get("productId");
    const templateId = sp.get("templateId");
    const status = sp.get("status");
    const before = sp.get("before");
    const limitRaw = Number.parseInt(sp.get("limit") || "100", 10);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

    const db = await getDatabase();
    const [deliveries, stats] = await Promise.all([
        listDeliveries(db, session.tenantId, { productId, templateId, status, before, limit }),
        deliveryStats(db, session.tenantId, productId),
    ]);
    return NextResponse.json({ ok: true, deliveries, stats });
}
