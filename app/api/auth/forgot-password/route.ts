export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { emailTemplates, sendEmail } from "@/lib/email";
import { generateUUID } from "@/lib/webcrypto";

function generateOTP(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(3));
    const num = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000;
    return num.toString().padStart(6, "0");
}

/**
 * POST /api/auth/forgot-password
 * Send a password-reset OTP to the given email (no auth required).
 * Body: { email: "user@example.com" }
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = (await request.json()) as { email?: string };

        if (!email?.includes("@")) {
            return NextResponse.json(
                { error: "A valid email address is required" },
                { status: 400 },
            );
        }

        const db = await getDatabase();

        // Look up user — always return success to avoid user enumeration
        const user = (await db
            .prepare(
                "SELECT id, email, password_hash, display_name FROM users WHERE email = ?",
            )
            .bind(email)
            .first()) as any;

        if (!user?.password_hash) {
            // Don't reveal whether the email exists
            return NextResponse.json({
                message:
                    "If that email is registered, a reset code has been sent.",
            });
        }

        // Rate limit: 1 email per 60 seconds
        const recent = (await db
            .prepare(
                "SELECT created_at FROM email_verification_tokens WHERE user_id = ? AND email = ? ORDER BY created_at DESC LIMIT 1",
            )
            .bind(user.id, `reset:${email}`)
            .first()) as any;

        if (recent?.created_at) {
            const elapsed = Date.now() - new Date(recent.created_at).getTime();
            if (elapsed < 60_000) {
                const wait = Math.ceil((60_000 - elapsed) / 1000);
                return NextResponse.json(
                    {
                        error: `Please wait ${wait} seconds before requesting another code`,
                    },
                    { status: 429 },
                );
            }
        }

        const otp = generateOTP();
        const tokenId = generateUUID();
        const verificationToken = generateUUID();
        const expiryMinutes = 10;
        const expiresAt = new Date(
            Date.now() + expiryMinutes * 60 * 1000,
        ).toISOString();

        // Clean up old reset tokens for this user
        await db
            .prepare(
                "DELETE FROM email_verification_tokens WHERE user_id = ? AND email LIKE 'reset:%'",
            )
            .bind(user.id)
            .run();

        // Store new token — use `reset:<email>` in the email column to distinguish from verification tokens
        await db
            .prepare(
                "INSERT INTO email_verification_tokens (id, user_id, email, otp_code, verification_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(
                tokenId,
                user.id,
                `reset:${email}`,
                otp,
                verificationToken,
                expiresAt,
            )
            .run();

        // Send password reset OTP email
        const recipientName = user.display_name || email.split("@")[0];
        const APP_URL =
            process.env.NEXT_PUBLIC_APP_URL || "https://accounts.elixpo.com";
        const verifyLink = `${APP_URL}/forgot-password?token=${verificationToken}`;
        const t = emailTemplates.passwordResetOtp(
            recipientName,
            otp,
            verifyLink,
            expiryMinutes,
        );
        await sendEmail({
            to: email,
            subject: t.subject,
            html: t.html,
            text: t.text,
        });

        console.log(`[ForgotPassword] OTP sent to ${email}`);

        return NextResponse.json({
            message: "If that email is registered, a reset code has been sent.",
        });
    } catch (error) {
        console.error("[ForgotPassword] Error:", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 },
        );
    }
}
