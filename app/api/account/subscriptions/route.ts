export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { getSession } from "@/lib/session";

/**
 * GET /api/account/subscriptions
 *
 * The signed-in user's OWN subscriptions across every app that uses Elixpo Pay
 * — what they're paying for and the rate. Keyed by their Elixpo Accounts id
 * (session.uid), which is the `external_uid` apps charge against. This is the
 * buyer view, distinct from the merchant dashboard (what they SELL).
 */
export async function GET(request: NextRequest) {
    const session = await getSession(request);
    if (!session) {
        return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const db = await getDatabase();
    const rows = ((
        await db
            .prepare(
                `SELECT s.id, s.tier, s.status, s.billing_mode,
                        s.current_period_start, s.current_period_end,
                        a.name AS app_name, a.slug AS app_slug, a.homepage_url,
                        p.name AS product_name,
                        pr.unit_amount, pr.currency, pr.interval, pr.interval_count, pr.nickname,
                        e.status AS entitlement_status, e.expires_at AS entitlement_expires
                 FROM subscriptions s
                 JOIN customers c ON s.customer_id = c.id
                 JOIN apps a ON s.app_id = a.id
                 LEFT JOIN products p ON s.product_id = p.id
                 LEFT JOIN prices pr ON s.price_id = pr.id
                 LEFT JOIN entitlements e ON e.app_id = s.app_id AND e.external_uid = c.external_uid
                 WHERE c.external_uid = ?1
                 ORDER BY (s.status = 'active') DESC, s.current_period_end DESC`,
            )
            .bind(session.uid)
            .all()
    ).results ?? []) as any[];

    const now = Date.now();
    const subscriptions = rows.map((r) => {
        const end = r.current_period_end
            ? new Date(`${r.current_period_end.replace(" ", "T")}Z`).getTime()
            : null;
        const active = r.status === "active" && (end === null || end > now);
        return {
            id: r.id,
            app_name: r.app_name,
            app_slug: r.app_slug,
            homepage_url: r.homepage_url,
            product_name: r.product_name,
            tier: r.tier,
            status: r.status,
            active,
            billing_mode: r.billing_mode,
            current_period_end: r.current_period_end,
            rate:
                r.unit_amount != null
                    ? {
                          amount: r.unit_amount,
                          currency: r.currency,
                          interval: r.interval,
                          interval_count: r.interval_count,
                          nickname: r.nickname,
                      }
                    : null,
        };
    });

    return NextResponse.json(
        { subscriptions },
        { headers: { "Cache-Control": "no-store" } },
    );
}
