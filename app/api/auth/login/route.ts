export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { appUrl, getEnv } from "@/lib/env";
import { buildAuthorizeUrl } from "@/lib/sso";

const STATE_COOKIE = "pay_oauth_state";

/** GET /api/auth/login — kick off the Elixpo Accounts authorization-code flow. */
export async function GET(request: NextRequest) {
    const next = request.nextUrl.searchParams.get("next") || "/dashboard";
    const redirectUri =
        (await getEnv("CALLBACK_URL")) || `${await appUrl()}/api/auth/callback`;

    const state = crypto.randomUUID();
    const url = await buildAuthorizeUrl(state, redirectUri);

    const res = NextResponse.redirect(url);
    // Bind state + post-login destination to a short-lived cookie (CSRF guard).
    res.cookies.set(STATE_COOKIE, `${state}|${next}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
    });
    return res;
}
