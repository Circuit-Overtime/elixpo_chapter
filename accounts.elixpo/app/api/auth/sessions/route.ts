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
    const res = await db
        .prepare(
            `SELECT id, ip_hash, ua_short, created_at, last_used_at, expires_at
             FROM refresh_tokens
             WHERE user_id = ? AND revoked = 0
                AND expires_at > CURRENT_TIMESTAMP
             ORDER BY last_used_at DESC, created_at DESC`,
        )
        .bind(auth.sub)
        .all<{
            id: string;
            ip_hash: string | null;
            ua_short: string | null;
            created_at: string;
            last_used_at: string | null;
            expires_at: string;
        }>();

    // Identify the current session by hashing the caller's refresh cookie
    // and matching against token_hash. Done outside the SELECT to avoid
    // leaking the hash into the column list.
    let currentId: string | null = null;
    const refreshCookie = request.cookies.get("refresh_token")?.value;
    if (refreshCookie) {
        const cookieHash = await hashString(refreshCookie);
        const me = await db
            .prepare(
                `SELECT id FROM refresh_tokens
                 WHERE user_id = ? AND token_hash = ? AND revoked = 0`,
            )
            .bind(auth.sub, cookieHash)
            .first<{ id: string }>();
        currentId = me?.id ?? null;
    }

    const sessions = (res.results || []).map((r) => ({
        id: r.id,
        device: r.ua_short || "Unknown device",
        ip_hash: r.ip_hash,
        created_at: r.created_at,
        last_used_at: r.last_used_at || r.created_at,
        expires_at: r.expires_at,
        is_current: r.id === currentId,
    }));

    return NextResponse.json({ sessions });
}
