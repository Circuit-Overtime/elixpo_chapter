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
 * DELETE /api/auth/sessions/[id]
 *
 * Sign out a specific session by revoking its refresh_token row. The
 * device's access_token (cached client-side, ≤15min TTL) keeps working
 * until it expires; after that the auto-refresh fails and the device
 * is bounced to /login. Revoking your own current session also works
 * (you get signed out everywhere on this device).
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const db = await getDatabase();
    const r = await db
        .prepare(
            `UPDATE refresh_tokens
             SET revoked = 1, revoked_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND revoked = 0`,
        )
        .bind(id, auth.sub)
        .run();
    if ((r.meta?.changes ?? 0) === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ revoked: true });
}
