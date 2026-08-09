export const runtime = "edge";

import { NextResponse } from "next/server";
import { SUPPORTED_LIXBLOGS_SCOPES } from "@/lib/lixblogs-scopes";
import { SUPPORTED_OAUTH_SCOPES } from "@/lib/oauth-scopes";

/**
 * GET /.well-known/oauth-authorization-server
 *
 * OAuth 2.0 Authorization Server Metadata (RFC 8414), extended with the
 * device authorization endpoint and grant type (RFC 8628) per
 * accounts.elixpo#79. Static per deployment — no per-request DB/auth work,
 * so it's safe to serve without rate limiting.
 */
export async function GET() {
    const issuer =
        process.env.NEXT_PUBLIC_APP_URL || "https://accounts.elixpo.com";

    return NextResponse.json({
        issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/api/auth/token`,
        device_authorization_endpoint: `${issuer}/api/auth/device/authorize`,
        scopes_supported: [
            ...SUPPORTED_OAUTH_SCOPES,
            ...SUPPORTED_LIXBLOGS_SCOPES,
        ],
        response_types_supported: ["code"],
        grant_types_supported: [
            "authorization_code",
            "refresh_token",
            "urn:ietf:params:oauth:grant-type:device_code",
        ],
        token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    });
}
