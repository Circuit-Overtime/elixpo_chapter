export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { sendMail } from "@/lib/mails";
import { verifyMfaChallengeToken } from "@/lib/mfa-utils";

const OTP_TTL_SECONDS = 5 * 60;
const COOLDOWN_SECONDS = 30;

/**
 * POST /api/auth/mfa/challenge/send-email-otp
 *
 * Used during a login challenge (after first factor passed) — generates
 * a 6-digit OTP, stores its hash in KV bound to the mfaToken, and emails
 * the user. The /verify endpoint reads the same KV entry to validate.
 *
 * Throttled: one send per 30 seconds per mfaToken.
 *
 * Body: { mfaToken, device?, ipAddress? }  (device/ip echoed into the
 * email body so the user can spot a phishing attempt).
 */
export async function POST(request: NextRequest) {
    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const mfaToken = body?.mfaToken;
    if (typeof mfaToken !== "string") {
        return NextResponse.json(
            { error: "mfaToken is required" },
            { status: 400 },
        );
    }

    const challenge = await verifyMfaChallengeToken(mfaToken);
    if (!challenge) {
        return NextResponse.json(
            { error: "mfaToken is invalid or expired" },
            { status: 401 },
        );
    }

    const db = await getDatabase();
    const user = (await db
        .prepare("SELECT email, display_name FROM users WHERE id = ?")
        .bind(challenge.userId)
        .first()) as { email: string; display_name: string | null } | null;
    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Confirm email_otp is actually one of the user's enrolled factors.
    const enrolled = (await db
        .prepare(
            `SELECT id FROM user_mfa_factors
             WHERE user_id = ? AND kind = 'email_otp'
                AND confirmed_at IS NOT NULL`,
        )
        .bind(challenge.userId)
        .first()) as { id: string } | null;
    if (!enrolled) {
        return NextResponse.json(
            { error: "Email OTP is not enabled on this account" },
            { status: 400 },
        );
    }

    const kv = (getRequestContext().env as any).KV as KVNamespace;
    const cooldownKey = `mfa_email_otp_cd:${mfaToken.slice(-32)}`;
    const cooled = await kv.get(cooldownKey);
    if (cooled) {
        return NextResponse.json(
            {
                error: `Please wait before requesting another code (cooldown ${COOLDOWN_SECONDS}s).`,
            },
            { status: 429 },
        );
    }

    // Shared unbiased OTP helper (rejection sampling, no modulo). See
    // generateNumericOtp() for the math. Lazy-imported to avoid a hard
    // dependency on lib/webcrypto from edge-runtime modules above.
    const { generateNumericOtp } = await import("@/lib/webcrypto");
    const code = generateNumericOtp();

    // Store the OTP keyed to this mfaToken so /verify can fetch + match it.
    // Last 32 chars of the token are enough entropy to namespace per-attempt.
    await kv.put(`mfa_email_otp:${mfaToken.slice(-32)}`, code, {
        expirationTtl: OTP_TTL_SECONDS,
    });
    await kv.put(cooldownKey, "1", { expirationTtl: COOLDOWN_SECONDS });

    const device =
        typeof body?.device === "string" ? body.device : "Unknown device";
    const ipAddress =
        typeof body?.ipAddress === "string" ? body.ipAddress : "unknown";

    await sendMail("login_otp", user.email, {
        name: user.display_name || user.email.split("@")[0],
        otp_code: code,
        expiry_minutes: Math.ceil(OTP_TTL_SECONDS / 60),
        device,
        ip_address: ipAddress,
    });

    return NextResponse.json({
        sent: true,
        expires_in: OTP_TTL_SECONDS,
    });
}
