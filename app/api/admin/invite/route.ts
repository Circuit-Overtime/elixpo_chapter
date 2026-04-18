export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "../../../../src/lib/admin-middleware";
import { getDatabase } from "../../../../src/lib/d1-client";
import { logAdminAction } from "../../../../src/lib/db";
import { emailTemplates, sendEmail } from "../../../../src/lib/email";
import {
    generateRandomString,
    generateUUID,
} from "../../../../src/lib/webcrypto";

/**
 * POST /api/admin/invite
 * Invite an email address to become an admin.
 * Body: { email }
 */
export async function POST(request: NextRequest) {
    const session = await verifyAdminSession(request);
    if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { email } = (await request.json()) as { email?: string };
        if (!email || !email.includes("@")) {
            return NextResponse.json(
                { error: "A valid email address is required" },
                { status: 400 },
            );
        }

        const db = await getDatabase();
        const ipAddress =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        // Check for existing pending invite
        const existing = await db
            .prepare(
                "SELECT id FROM admin_invites WHERE email = ? AND accepted = 0 AND expires_at > CURRENT_TIMESTAMP",
            )
            .bind(email)
            .first();

        if (existing) {
            return NextResponse.json(
                { error: "An active invite already exists for this email" },
                { status: 409 },
            );
        }

        const token = generateRandomString(48);
        const expiresAt = new Date(
            Date.now() + 48 * 60 * 60 * 1000,
        ).toISOString(); // 48 hours

        await db
            .prepare(
                "INSERT INTO admin_invites (id, email, invited_by, token, expires_at) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(generateUUID(), email, session.userId, token, expiresAt)
            .run();

        // Send invite email
        const APP_URL =
            process.env.NEXT_PUBLIC_APP_URL || "https://accounts.elixpo.com";
        const inviteLink = `${APP_URL}/admin/accept-invite?token=${token}`;

        // Get inviter's email for the template
        const inviter = (await db
            .prepare("SELECT email FROM users WHERE id = ?")
            .bind(session.userId)
            .first()) as any;
        const inviterEmail = inviter?.email || "an admin";
        const recipientName = email.split("@")[0];

        const t = emailTemplates.adminInvite(
            recipientName,
            inviterEmail,
            inviteLink,
        );
        await sendEmail({
            to: email,
            subject: t.subject,
            html: t.html,
            text: t.text,
        });

        await logAdminAction(db, {
            id: generateUUID(),
            adminId: session.userId,
            action: "invite_admin",
            resourceType: "admin_invite",
            resourceId: email,
            changes: { email, inviteLink },
            ipAddress,
            userAgent,
        });

        return NextResponse.json({
            success: true,
            message: `Invitation sent to ${email}`,
        });
    } catch (error) {
        console.error("[Admin Invite] Error:", error);
        return NextResponse.json(
            { error: "Failed to send invitation" },
            { status: 500 },
        );
    }
}

/**
 * GET /api/admin/invite?token=<token>
 * Validate an invite token (used by the accept-invite page).
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get("token");
        if (!token)
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 },
            );

        const db = await getDatabase();

        const invite = (await db
            .prepare(
                "SELECT email, accepted, expires_at FROM admin_invites WHERE token = ?",
            )
            .bind(token)
            .first()) as any;

        if (!invite) {
            return NextResponse.json(
                { error: "Invalid invitation link" },
                { status: 400 },
            );
        }
        if (invite.accepted) {
            return NextResponse.json(
                {
                    error: "This invitation has already been accepted",
                    alreadyAccepted: true,
                },
                { status: 400 },
            );
        }
        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json(
                { error: "This invitation has expired" },
                { status: 400 },
            );
        }

        return NextResponse.json({ email: invite.email });
    } catch (error) {
        console.error("[Admin Invite] Validate error:", error);
        return NextResponse.json(
            { error: "Failed to validate invitation" },
            { status: 500 },
        );
    }
}

/**
 * PATCH /api/admin/invite
 * Accept an invite token. The user must be logged in.
 * Body: { token }
 */
export async function PATCH(request: NextRequest) {
    try {
        const { token } = (await request.json()) as { token?: string };
        if (!token)
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 },
            );

        // Verify user is logged in
        const cookieToken = request.cookies.get("access_token")?.value;
        if (!cookieToken) {
            return NextResponse.json(
                { error: "You must be logged in to accept an invitation" },
                { status: 401 },
            );
        }

        const { verifyJWT } = await import("@/lib/jwt");
        const payload = await verifyJWT(cookieToken);
        if (!payload || payload.type !== "access") {
            return NextResponse.json(
                { error: "Invalid session" },
                { status: 401 },
            );
        }

        const db = await getDatabase();

        const invite = (await db
            .prepare(
                "SELECT id, email, accepted, expires_at FROM admin_invites WHERE token = ?",
            )
            .bind(token)
            .first()) as any;

        if (!invite) {
            return NextResponse.json(
                { error: "Invalid invitation link" },
                { status: 400 },
            );
        }
        if (invite.accepted) {
            return NextResponse.json(
                { error: "This invitation has already been accepted" },
                { status: 400 },
            );
        }
        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json(
                { error: "This invitation has expired" },
                { status: 400 },
            );
        }

        // Verify the logged-in user's email matches the invite
        const user = (await db
            .prepare("SELECT id, email FROM users WHERE id = ?")
            .bind(payload.sub)
            .first()) as any;
        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 },
            );
        }

        if (user.email !== invite.email) {
            return NextResponse.json(
                {
                    error: `This invitation was sent to ${invite.email}. Please log in with that email address.`,
                },
                { status: 403 },
            );
        }

        // Grant admin
        await db
            .prepare(
                "UPDATE users SET is_admin = 1, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind("admin", user.id)
            .run();

        // Mark invite as accepted
        await db
            .prepare(
                "UPDATE admin_invites SET accepted = 1, accepted_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(invite.id)
            .run();

        return NextResponse.json({
            success: true,
            message: "You are now an admin!",
        });
    } catch (error) {
        console.error("[Admin Invite] Accept error:", error);
        return NextResponse.json(
            { error: "Failed to accept invitation" },
            { status: 500 },
        );
    }
}
