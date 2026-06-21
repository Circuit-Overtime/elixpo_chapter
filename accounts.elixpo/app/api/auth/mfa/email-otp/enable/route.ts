export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { verifyJWT } from "@/lib/jwt";
import { generateUUID } from "@/lib/webcrypto";

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
 * POST /api/auth/mfa/email-otp/enable
 *
 * Email-OTP as a factor has no real enrollment ceremony: we already know
 * the user's email (verified). We just insert a confirmed row marking
 * that this factor kind is available at challenge time. Idempotent —
 * calling twice is a no-op.
 */
export async function POST(request: NextRequest) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDatabase();

    // Require a verified email — otherwise we'd be enabling a factor we
    // can't actually deliver to.
    const user = (await db
        .prepare("SELECT email_verified FROM users WHERE id = ?")
        .bind(auth.sub)
        .first()) as { email_verified: number } | null;
    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.email_verified) {
        return NextResponse.json(
            {
                error: "Verify your email address before enabling email OTP as a 2FA method.",
            },
            { status: 400 },
        );
    }

    const existing = (await db
        .prepare(
            `SELECT id FROM user_mfa_factors
             WHERE user_id = ? AND kind = 'email_otp'`,
        )
        .bind(auth.sub)
        .first()) as { id: string } | null;
    if (existing) {
        return NextResponse.json({ confirmed: true, factor_id: existing.id });
    }

    const id = generateUUID();
    await db
        .prepare(
            `INSERT INTO user_mfa_factors
                (id, user_id, kind, name, confirmed_at)
             VALUES (?, ?, 'email_otp', 'Email code', CURRENT_TIMESTAMP)`,
        )
        .bind(id, auth.sub)
        .run();

    return NextResponse.json({ confirmed: true, factor_id: id });
}
