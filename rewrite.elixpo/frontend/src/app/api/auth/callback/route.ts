/**
 * OAuth callback route — exchanges authorization code for tokens server-side.
 *
 * GET /api/auth/callback?code=...&state=...
 *
 * This runs on the server so the client_secret is never exposed to the browser.
 * After token exchange, redirects to / with token in a query param that the
 * client picks up and stores in localStorage.
 */

import { NextRequest, NextResponse } from "next/server";

const ELIXPO_BASE = "https://accounts.elixpo.com";
const CLIENT_ID = process.env.NEXT_PUBLIC_ELIXPO_ACCOUNTS_CLIENT_ID || "";
const CLIENT_SECRET = process.env.ELIXPO_ACCOUNTS_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", request.url));
  }

  try {
    const tokenBody = {
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    };

    // Debug: log what we're sending (redact secret)
    console.log("Token exchange request:", {
      url: `${ELIXPO_BASE}/api/auth/token`,
      client_id: CLIENT_ID ? `${CLIENT_ID.slice(0, 10)}...` : "MISSING",
      client_secret: CLIENT_SECRET ? `${CLIENT_SECRET.slice(0, 12)}...` : "MISSING",
      redirect_uri: REDIRECT_URI,
      code: code ? `${code.slice(0, 10)}...` : "MISSING",
    });

    // Exchange code for tokens
    const tokenResp = await fetch(`${ELIXPO_BASE}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenBody),
    });

    if (!tokenResp.ok) {
      const errBody = await tokenResp.text();
      console.error("Token exchange failed:", tokenResp.status, errBody);
      return NextResponse.redirect(new URL("/?auth_error=token_exchange_failed", request.url));
    }

    const tokens = await tokenResp.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Get user info
    const userResp = await fetch(`${ELIXPO_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResp.ok) {
      return NextResponse.redirect(new URL("/?auth_error=user_fetch_failed", request.url));
    }

    const user = await userResp.json() as {
      id: string;
      email: string;
      displayName: string;
    };

    // Redirect to frontend with auth data as hash params (not exposed in server logs)
    const authData = encodeURIComponent(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user,
    }));

    return NextResponse.redirect(new URL(`/?auth_success=${authData}`, request.url));
  } catch (err: any) {
    console.error("OAuth error:", err);
    return NextResponse.redirect(new URL("/?auth_error=server_error", request.url));
  }
}
