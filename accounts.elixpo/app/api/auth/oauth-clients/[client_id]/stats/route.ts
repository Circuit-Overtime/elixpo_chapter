export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { verifyJWT } from "@/lib/jwt";

async function getAuth(request: NextRequest) {
    const token =
        request.cookies.get("access_token")?.value ||
        request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const payload = await verifyJWT(token);
    if (payload?.type !== "access") return null;
    return payload;
}

/**
 * GET /api/auth/oauth-clients/[client_id]/stats
 *
 * Owner-only stats panel for an OAuth app the caller owns. Returns
 * aggregate user activity (no per-user data) and webhook delivery status.
 *
 * 403s if the caller isn't the app owner — distinct from the user-facing
 * /api/auth/connected-services/[client_id], which gates on the caller
 * being authorized to the app, not owning it.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ client_id: string }> },
) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { client_id } = await params;
    const db = await getDatabase();

    const app = await db
        .prepare(
            `SELECT client_id, owner_id, request_count, last_used, created_at
             FROM oauth_clients
             WHERE client_id = ? AND is_active = 1`,
        )
        .bind(client_id)
        .first<{
            client_id: string;
            owner_id: string;
            request_count: number | null;
            last_used: string | null;
            created_at: string;
        }>();

    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (app.owner_id !== auth.sub)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 30-day window for the chart. SQLite's DATE() truncates the ISO
    // string to YYYY-MM-DD so the GROUP BY collapses cleanly per day.
    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const [aggregate, timeline, endpoints] = await db.batch([
        db
            .prepare(
                `SELECT
                    COUNT(*) AS total_sign_ins,
                    COUNT(DISTINCT user_id) AS unique_users,
                    SUM(CASE WHEN revoked = 0 THEN 1 ELSE 0 END) AS active_sessions
                 FROM refresh_tokens
                 WHERE client_id = ?`,
            )
            .bind(client_id),
        db
            .prepare(
                `SELECT DATE(created_at) AS date, COUNT(*) AS count
                 FROM refresh_tokens
                 WHERE client_id = ? AND created_at >= ?
                 GROUP BY DATE(created_at)
                 ORDER BY date`,
            )
            .bind(client_id, since),
        db
            .prepare(
                `SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
                    MAX(last_delivery_at) AS last_delivery_at
                 FROM oauth_client_webhook_endpoints
                 WHERE client_id = ?`,
            )
            .bind(client_id),
    ]);

    const agg = (aggregate.results || [])[0] as
        | {
              total_sign_ins: number;
              unique_users: number;
              active_sessions: number;
          }
        | undefined;
    const ep = (endpoints.results || [])[0] as
        | {
              total: number;
              active: number;
              last_delivery_at: string | null;
          }
        | undefined;

    return NextResponse.json({
        client_id: app.client_id,
        created_at: app.created_at,
        request_count: app.request_count ?? 0,
        last_used: app.last_used,
        total_sign_ins: agg?.total_sign_ins ?? 0,
        unique_users: agg?.unique_users ?? 0,
        active_sessions: agg?.active_sessions ?? 0,
        sign_in_timeline: (timeline.results || []) as Array<{
            date: string;
            count: number;
        }>,
        webhooks: {
            total_endpoints: ep?.total ?? 0,
            active_endpoints: ep?.active ?? 0,
            last_delivery_at: ep?.last_delivery_at ?? null,
        },
    });
}
