export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import {
    emailTemplates,
    sendApiKeyCreatedEmail,
    sendEmail,
    sendOTPEmail,
    sendPasswordResetEmail,
    sendSigninConfirmationEmail,
    sendSignupConfirmationEmail,
} from "../../../../src/lib/email";

export async function POST(request: NextRequest) {
    const secret = process.env.INTERNAL_API_SECRET;
    const auth = request.headers.get("Authorization");

    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, to, data }: any = await request.json();

    try {
        switch (type) {
            case "otp":
                await sendOTPEmail(to, data.recipientName ?? "", data.otpCode);
                break;
            case "password_reset":
                await sendPasswordResetEmail(
                    to,
                    data.recipientName ?? "",
                    data.resetUrl,
                );
                break;
            case "signup_confirmation":
                await sendSignupConfirmationEmail(
                    to,
                    data.recipientName ?? "",
                    data.verificationUrl,
                );
                break;
            case "signin_notification":
                await sendSigninConfirmationEmail(
                    to,
                    data.recipientName ?? "",
                    data.ipAddress,
                    data.userAgent,
                );
                break;
            case "api_key_created":
                await sendApiKeyCreatedEmail(
                    to,
                    data.recipientName ?? "",
                    data.keyName,
                    data.keyPrefix,
                    Array.isArray(data.scopes) ? data.scopes : [],
                );
                break;
            case "account_suspended": {
                const t = emailTemplates.accountSuspended(
                    data.recipientName ?? "",
                    data.reason,
                );
                await sendEmail({
                    to,
                    subject: t.subject,
                    html: t.html,
                    text: t.text,
                });
                break;
            }
            default:
                return NextResponse.json(
                    { error: `Unknown email type: ${type}` },
                    { status: 400 },
                );
        }
        return NextResponse.json({ success: true });
    } catch (err: any) {
        // Log details server-side; return a generic message to callers so
        // we don't leak SMTP/transport internals to a misbehaving client.
        console.error("[send-email]", err);
        return NextResponse.json(
            { error: "Failed to send email" },
            { status: 500 },
        );
    }
}
