export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { verifyJWT } from "@/lib/jwt";

/**
 * POST /api/auth/delete-account
 * Permanently delete the authenticated user's account and all associated data
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get("access_token")?.value;
        if (!token)
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );

        const payload = await verifyJWT(token);
        if (!payload)
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 },
            );

        const userId = payload.sub;
        const db = await getDatabase();

        // Capture which apps the user authorized BEFORE deleting tokens, so we
        // can notify each to purge the user's data (first-party apps only).
        let connectedClientIds: string[] = [];
        try {
            const conn = await db
                .prepare(
                    "SELECT DISTINCT client_id FROM refresh_tokens WHERE user_id = ? AND client_id IS NOT NULL",
                )
                .bind(userId)
                .all();
            connectedClientIds = (conn.results || []).map((r: any) => r.client_id);
        } catch {}

        // Delete in order: dependent tables first, then user
        await db
            .prepare("DELETE FROM refresh_tokens WHERE user_id = ?")
            .bind(userId)
            .run();
        await db
            .prepare("DELETE FROM email_verification_tokens WHERE user_id = ?")
            .bind(userId)
            .run();
        await db
            .prepare("DELETE FROM identities WHERE user_id = ?")
            .bind(userId)
            .run();
        await db
            .prepare("DELETE FROM audit_logs WHERE user_id = ?")
            .bind(userId)
            .run();
        // Deactivate OAuth apps owned by this user
        await db
            .prepare(
                "UPDATE oauth_clients SET is_active = 0 WHERE owner_id = ?",
            )
            .bind(userId)
            .run();
        // Delete the user
        await db.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();

        console.log(`[Account] Deleted user: ${userId}`);

        // Notify connected first-party apps to hard-purge the user's data.
        try {
            const { fireRevocationToAll } = await import("@/lib/revocation-webhook");
            await fireRevocationToAll(connectedClientIds, userId, "user.deleted");
        } catch {}

        // Clear auth cookies
        const response = NextResponse.json({
            message: "Account deleted successfully",
        });
        response.cookies.set("access_token", "", { maxAge: 0, path: "/" });
        response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });
        return response;
    } catch (error) {
        console.error("[Account] Delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete account" },
            { status: 500 },
        );
    }
}
