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

    const metadata = {
        issuer,
        authorization_endpoint: `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/api/auth/token`,
        device_authorization_endpoint: `${issuer}/api/auth/device/authorize`,
        revocation_endpoint: `${issuer}/api/auth/revoke`,

        // Supported features
        scopes_supported: [
            ...SUPPORTED_OAUTH_SCOPES,
            ...SUPPORTED_LIXBLOGS_SCOPES,
        ],
        grant_types_supported: [
            "authorization_code",
            "refresh_token",
            "urn:ietf:params:oauth:grant-type:device_code",
        ],
        response_types_supported: ["code"],
        token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
        revocation_endpoint_auth_methods_supported: [
            "client_secret_post",
            "none",
        ],

        // Note: PKCE (code_challenge_methods_supported: ["S256"]) is intentionally
        // omitted here as it is not yet implemented for authorization_code.

        // Proprietary LixBlogs CLI extensions
        elixpo_contract_version: "1.0.0",
        elixpo_min_compatible_cli_version: "0.1.0",
        elixpo_access_token_lifetime_seconds:
            parseInt(process.env.JWT_EXPIRATION_MINUTES || "15", 10) * 60,
        elixpo_refresh_token_lifetime_seconds:
            parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || "30", 10) *
            86400,
        elixpo_refresh_token_rotation: {
            policy: "rotate_always",
            reuse_action: "revoke_family",
        },
        elixpo_device_flow_polling: {
            interval_seconds: 5,
            max_attempts: 120, // 10 minutes at 5s intervals
            slow_down_interval_seconds: 10,
        },
    };

    return NextResponse.json(metadata, {
        headers: {
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
