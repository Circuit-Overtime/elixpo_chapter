/**
 * Server-side session refresh — shared by `/api/auth/me` and any other
 * route that needs to transparently rotate an expired access token using
 * a still-valid refresh-token cookie.
 *
 * The split exists so server-only routes (e.g. /oauth/authorize, which
 * 302s to the consent screen) can refresh inline instead of bouncing the
 * buyer through /login first — eliminating the "spinner flash" UX nit
 * for users who already have a valid session.
 *
 * Pattern:
 *
 *   const result = await tryRefreshSession(request, refreshToken);
 *   if (!result.ok) return NextResponse.redirect(loginUrl);
 *   const response = NextResponse.redirect(nextUrl);
 *   applyRefreshedCookies(response, result);
 *   return response;
 *
 * The DB rotation (revoke old, store new) and device-fingerprint carry
 * happen inside `tryRefreshSession` — callers only deal with the cookies.
 */

import type { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "./d1-client";
import {
    getRefreshTokenByHash,
    getUserById,
    revokeRefreshToken,
    createRefreshToken as storeRefreshToken,
} from "./db";
import { createAccessToken, createRefreshToken, verifyJWT } from "./jwt";
import { generateUUID, hashString } from "./webcrypto";

export type RefreshSuccess = {
    ok: true;
    userId: string;
    email: string;
    displayName: string | null;
    provider:
        | "google"
        | "github"
        | "discord"
        | "microsoft"
        | "email"
        | undefined;
    emailVerified: boolean;
    newAccessToken: string;
    newRefreshToken: string;
    accessMaxAge: number;
    refreshMaxAge: number;
};

export type RefreshFailure = {
    ok: false;
    reason:
        | "invalid_token"
        | "token_revoked"
        | "user_not_found"
        | "internal_error";
};

/**
 * Attempt to mint a new access + refresh token pair using the supplied
 * refresh token. Rotates the DB row (revokes the old, stores the new)
 * and preserves the device fingerprint from the incoming request.
 *
 * Does NOT mutate cookies — caller applies them via
 * `applyRefreshedCookies`.
 */
export async function tryRefreshSession(
    request: NextRequest,
    refreshToken: string,
): Promise<RefreshSuccess | RefreshFailure> {
    try {
        const payload = await verifyJWT(refreshToken);
        if (payload?.type !== "refresh") {
            return { ok: false, reason: "invalid_token" };
        }

        const db = await getDatabase();
        const refreshTokenHash = await hashString(refreshToken);
        const tokenRecord = await getRefreshTokenByHash(db, refreshTokenHash);
        if (!tokenRecord) {
            return { ok: false, reason: "token_revoked" };
        }

        const user = (await getUserById(db, payload.sub)) as {
            id: string;
            email: string;
            display_name: string | null;
            email_verified: number;
        } | null;
        if (!user) {
            return { ok: false, reason: "user_not_found" };
        }

        const accessMaxAge =
            parseInt(process.env.JWT_EXPIRATION_MINUTES || "15", 10) * 60;

        // Carry the remaining lifetime of the inbound refresh token
        // forward — the new refresh token shouldn't extend past the
        // user's original sign-in session duration (so it can't be
        // refreshed indefinitely past the lifetime of the original
        // grant).
        const refreshRemainingSeconds = Math.max(
            payload.exp - Math.floor(Date.now() / 1000),
            0,
        );
        const refreshDays = Math.max(
            Math.ceil(refreshRemainingSeconds / 86400),
            1,
        );
        const refreshMaxAge = refreshDays * 86400;

        const newAccessToken = await createAccessToken(
            payload.sub,
            user.email,
            payload.provider,
            parseInt(process.env.JWT_EXPIRATION_MINUTES || "15", 10),
        );
        const newRefreshToken = await createRefreshToken(
            payload.sub,
            payload.provider,
            refreshDays,
        );
        const newRefreshTokenHash = await hashString(newRefreshToken);

        // Carry the device fingerprint from THIS request through to the
        // new row so the active-sessions list keeps showing the same
        // device after rotation (otherwise every token refresh would
        // create a row with NULL metadata).
        const ipAddress =
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            request.headers.get("cf-connecting-ip") ||
            "";
        const userAgent = request.headers.get("user-agent") || "";
        const { hashIpForSession, shortUaForSession } = await import("./db");

        await revokeRefreshToken(db, refreshTokenHash);
        await storeRefreshToken(db, {
            id: generateUUID(),
            userId: payload.sub,
            tokenHash: newRefreshTokenHash,
            expiresAt: new Date(Date.now() + refreshMaxAge * 1000),
            ipHash:
                (await hashIpForSession(ipAddress)) ||
                (tokenRecord as any).ip_hash ||
                null,
            uaShort:
                shortUaForSession(userAgent) ||
                (tokenRecord as any).ua_short ||
                null,
        });

        return {
            ok: true,
            userId: payload.sub,
            email: user.email,
            displayName: user.display_name ?? null,
            provider: payload.provider,
            emailVerified: !!user.email_verified,
            newAccessToken,
            newRefreshToken,
            accessMaxAge,
            refreshMaxAge,
        };
    } catch (err) {
        console.error(
            "[auth-refresh] tryRefreshSession failed: %s",
            err instanceof Error ? err.message : String(err),
        );
        return { ok: false, reason: "internal_error" };
    }
}

/**
 * Apply the rotated tokens to a NextResponse — sets the same trio of
 * cookies (`access_token`, `refresh_token`, `user_id`) the login route
 * sets. Mutates the response in place; returns the same reference for
 * chaining ergonomics.
 */
export function applyRefreshedCookies(
    response: NextResponse,
    refresh: RefreshSuccess,
): NextResponse {
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set("access_token", refresh.newAccessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: refresh.accessMaxAge,
        path: "/",
    });
    response.cookies.set("refresh_token", refresh.newRefreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: refresh.refreshMaxAge,
        path: "/",
    });
    response.cookies.set("user_id", refresh.userId, {
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        maxAge: refresh.refreshMaxAge,
        path: "/",
    });
    return response;
}
