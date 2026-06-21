export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { verifyJWT } from "@/lib/jwt";
import { hashString } from "@/lib/webcrypto";

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
 * GET /api/auth/sessions
 *
 * List every active refresh_token row for the caller. Each row = one
 * signed-in device. The session created by the request's own refresh
 * token cookie is flagged with `is_current: true` so the UI can label
 * "This device" without a separate round-trip.
 *
 * Revoked sessions are excluded — the user wouldn't be able to do
 * anything with them anyway and they'd just clutter the list.
 */
export async function GET(request: NextRequest) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDatabase();

    // Group by device fingerprint (ip_hash, ua_short) so multiple
    // sign-ins from the same browser don't render as separate rows.
    // Each row represents ONE physical device; "Sign out" on that row
    // revokes every underlying session belonging to that fingerprint
    // (handled by the DELETE endpoint).
    //
    // COALESCE pins NULL metadata to a sentinel so the GROUP BY
    // collapses unknown-device sessions together instead of leaving
    // them as separate NULL-keyed groups.
    const res = await db
        .prepare(
            `SELECT
                MIN(id) AS id,
                COALESCE(ip_hash, '__none__') AS ip_key,
                COALESCE(ua_short, '__none__') AS ua_key,
                ip_hash,
                ua_short,
                MIN(created_at) AS created_at,
                MAX(COALESCE(last_used_at, created_at)) AS last_used_at,
                MAX(expires_at) AS expires_at,
                COUNT(*) AS session_count
             FROM refresh_tokens
             WHERE user_id = ? AND revoked = 0
                AND expires_at > CURRENT_TIMESTAMP
             GROUP BY ip_key, ua_key
             ORDER BY last_used_at DESC`,
        )
        .bind(auth.sub)
        .all<{
            id: string;
            ip_hash: string | null;
            ua_short: string | null;
            created_at: string;
            last_used_at: string;
            expires_at: string;
            session_count: number;
        }>();

    // Identify which group contains the caller's current refresh-token
    // cookie. We hash the cookie, find its row, and match by fingerprint
    // against the grouped rows.
    let currentIp: string | null = null;
    let currentUa: string | null = null;
    const refreshCookie = request.cookies.get("refresh_token")?.value;
    if (refreshCookie) {
        const cookieHash = await hashString(refreshCookie);
        const me = await db
            .prepare(
                `SELECT ip_hash, ua_short FROM refresh_tokens
                 WHERE user_id = ? AND token_hash = ? AND revoked = 0`,
            )
            .bind(auth.sub, cookieHash)
            .first<{ ip_hash: string | null; ua_short: string | null }>();
        currentIp = me?.ip_hash ?? null;
        currentUa = me?.ua_short ?? null;
    }

    const sessions = (res.results || []).map((r) => ({
        id: r.id,
        device: r.ua_short || "Unknown device",
        ip_hash: r.ip_hash,
        created_at: r.created_at,
        last_used_at: r.last_used_at,
        expires_at: r.expires_at,
        session_count: r.session_count,
        is_current: r.ip_hash === currentIp && r.ua_short === currentUa,
    }));

    return NextResponse.json({ sessions });
}
