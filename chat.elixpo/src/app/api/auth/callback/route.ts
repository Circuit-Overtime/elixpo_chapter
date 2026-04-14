import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getRedirectUri, setSessionCookie } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied
  if (error) {
    return NextResponse.redirect(new URL("/?auth_error=denied", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=no_code", request.url));
  }

  // Verify state
  const storedState = request.cookies.get("oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/?auth_error=state_mismatch", request.url));
  }

  try {
    const redirectUri = getRedirectUri(request);
    const tokens = await exchangeCode(code, redirectUri);

    const response = NextResponse.redirect(new URL("/", request.url));
    // Set session cookie with tokens
    response.headers.append("Set-Cookie", setSessionCookie(tokens.access_token, tokens.refresh_token, tokens.expires_in));
    // Clear the state cookie
    response.headers.append("Set-Cookie", "oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?auth_error=token_exchange", request.url));
  }
}
