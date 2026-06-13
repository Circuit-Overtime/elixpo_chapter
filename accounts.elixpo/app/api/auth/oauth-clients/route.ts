export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { createOAuthClient, getOAuthClientById, getUserById } from "@/lib/db";
import { sendAppRegisteredEmail } from "@/lib/email";
import { verifyJWT } from "@/lib/jwt";
import { generateRandomString, hashString } from "@/lib/webcrypto";
import {
    mintWebhookSecret,
    VALID_EVENTS,
    type AppWebhookEvent,
} from "@/lib/app-webhooks";
import { getRequestContext } from "@cloudflare/next-on-pages";

async function getAuth(request: NextRequest) {
    const token =
        request.cookies.get("access_token")?.value ||
        request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const payload = await verifyJWT(token);
    if (payload?.type !== "access") return null;
    return payload;
}

/**
 * POST /api/auth/oauth-clients
 *
 * Register a new OAuth 2.0 application
 * Third-party services use this endpoint to register for sign in/sign up
 *
 * Returns: { client_id, client_secret }
 *
 * IMPORTANT: Store client_secret securely. It will NOT be retrievable after first creation.
 *
 * Request body:
 * {
 *   "name": "My Service Name",
 *   "redirect_uris": ["https://myservice.com/auth/callback"],
 *   "logo_uri": "https://myservice.com/logo.png", (optional)
 *   "description": "Brief description of your service", (optional)
 *   "scopes": ["openid", "profile", "email"]
 * }
 *
 * Response:
 * {
 *   "client_id": "cli_xxxxx",
 *   "client_secret": "secret_xxxxx",
 *   "name": "My Service Name",
 *   "redirect_uris": ["https://myservice.com/auth/callback"],
 *   "scopes": ["openid", "profile", "email"],
 *   "created_at": "2026-02-21T10:00:00Z"
 * }
 */
export async function POST(request: NextRequest) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Enforce email verification
        const db = await getDatabase();
        const user = (await getUserById(db, auth.sub)) as any;
        if (user && !user.email_verified) {
            return NextResponse.json(
                {
                    error: "Please verify your email address before registering an OAuth application.",
                },
                { status: 403 },
            );
        }

        const body: any = await request.json();
        const {
            name,
            redirect_uris,
            logo_uri,
            description,
            homepage_url,
            scopes,
            webhook_url,
            webhook_events,
        } = body;

        // Validate required fields
        if (
            !name ||
            !redirect_uris ||
            !Array.isArray(redirect_uris) ||
            redirect_uris.length === 0
        ) {
            return NextResponse.json(
                {
                    error: "name and redirect_uris (non-empty array) are required",
                },
                { status: 400 },
            );
        }

        if (redirect_uris.length > 5) {
            return NextResponse.json(
                { error: "Maximum of 5 redirect URIs allowed" },
                { status: 400 },
            );
        }

        // Validate redirect URIs are valid URLs (HTTP and HTTPS allowed)
        const validUris: string[] = [];
        for (const uri of redirect_uris) {
            try {
                const parsed = new URL(uri);
                if (
                    parsed.protocol !== "https:" &&
                    parsed.protocol !== "http:"
                ) {
                    return NextResponse.json(
                        {
                            error: `Redirect URI must use HTTP or HTTPS: ${uri}`,
                        },
                        { status: 400 },
                    );
                }
                validUris.push(uri);
            } catch {
                return NextResponse.json(
                    { error: `Invalid redirect_uri: ${uri}` },
                    { status: 400 },
                );
            }
        }

        // Validate scopes if provided
        const validScopes = ["openid", "profile", "email", "phone", "address"];
        if (scopes && Array.isArray(scopes)) {
            for (const scope of scopes) {
                if (!validScopes.includes(scope)) {
                    return NextResponse.json(
                        {
                            error: `Invalid scope: ${scope}. Valid scopes: ${validScopes.join(", ")}`,
                        },
                        { status: 400 },
                    );
                }
            }
        }

        // Validate optional webhook subscription
        let webhookUrlValid: string | null = null;
        let webhookEventsValid: AppWebhookEvent[] | null = null;
        if (webhook_url !== undefined && webhook_url !== null) {
            if (typeof webhook_url !== "string") {
                return NextResponse.json(
                    { error: "webhook_url must be a string" },
                    { status: 400 },
                );
            }
            try {
                const parsed = new URL(webhook_url);
                if (
                    parsed.protocol !== "https:" &&
                    parsed.protocol !== "http:"
                ) {
                    return NextResponse.json(
                        {
                            error: "webhook_url must use https (http allowed for localhost only)",
                        },
                        { status: 400 },
                    );
                }
                webhookUrlValid = webhook_url;
            } catch {
                return NextResponse.json(
                    { error: "Invalid webhook_url" },
                    { status: 400 },
                );
            }

            if (!Array.isArray(webhook_events) || webhook_events.length === 0) {
                return NextResponse.json(
                    {
                        error: "webhook_events must be a non-empty array when webhook_url is set",
                    },
                    { status: 400 },
                );
            }
            for (const ev of webhook_events) {
                if (
                    typeof ev !== "string" ||
                    !VALID_EVENTS.includes(ev as AppWebhookEvent)
                ) {
                    return NextResponse.json(
                        {
                            error: `Invalid event: ${ev}. Valid events: ${VALID_EVENTS.join(", ")}`,
                        },
                        { status: 400 },
                    );
                }
            }
            webhookEventsValid = webhook_events as AppWebhookEvent[];
        }

        // Generate secure credentials
        const clientId = `cli_${generateRandomString(32)}`;
        const clientSecret = `secret_${generateRandomString(64)}`;
        const clientSecretHash = await hashString(clientSecret);

        // Optional per-app webhook secret. Plaintext goes to KV; only the
        // hash lands in D1.
        let webhookSecretPlaintext: string | null = null;
        let webhookSecretHash: string | null = null;
        if (webhookUrlValid) {
            const minted = await mintWebhookSecret();
            webhookSecretPlaintext = minted.plaintext;
            webhookSecretHash = minted.hash;
        }

        const now = new Date().toISOString();

        // Store in D1
        try {
            await createOAuthClient(db, {
                clientId,
                clientSecretHash,
                name,
                redirectUris: JSON.stringify(validUris),
                scopes: JSON.stringify(scopes || validScopes),
                ownerId: auth.sub,
                description,
                homepageUrl: homepage_url,
                webhookUrl: webhookUrlValid,
                webhookSecretHash,
                webhookEvents: webhookEventsValid
                    ? JSON.stringify(webhookEventsValid)
                    : null,
            });

            // Stash the webhook plaintext in KV under the per-app key the
            // dispatcher reads (see lib/app-webhooks.ts defaultSecretResolver).
            // D1 only ever sees the hash.
            if (webhookSecretPlaintext) {
                try {
                    const ctx = getRequestContext();
                    await (ctx.env as any).KV.put(
                        `webhook_secret:${clientId}`,
                        webhookSecretPlaintext,
                    );
                } catch (kvErr) {
                    console.error(
                        "[OAuth Client] Failed to store webhook secret in KV:",
                        kvErr,
                    );
                }
            }
            console.log(`[OAuth Client] Registered: ${name} (${clientId})`);

            // Notify owner via email (fire-and-forget)
            try {
                const owner = (await getUserById(db, auth.sub)) as any;
                if (owner?.email) {
                    const ownerName =
                        owner.display_name || owner.email.split("@")[0];
                    await sendAppRegisteredEmail(
                        owner.email,
                        ownerName,
                        name,
                        clientId,
                    );
                }
            } catch (emailError) {
                console.error(
                    "[OAuth Client] Failed to send registration email:",
                    emailError,
                );
            }
        } catch (dbError) {
            console.error("[OAuth Client] Database storage error:", dbError);
            return NextResponse.json(
                { error: "Failed to register application" },
                { status: 500 },
            );
        }

        // Return credentials (client_secret + webhook_secret shown only once)
        return NextResponse.json(
            {
                client_id: clientId,
                client_secret: clientSecret,
                name,
                redirect_uris: validUris,
                homepage_url,
                logo_uri,
                description,
                scopes: scopes || validScopes,
                webhook_url: webhookUrlValid,
                webhook_events: webhookEventsValid,
                webhook_secret: webhookSecretPlaintext,
                created_at: now,
                _notice:
                    "Store client_secret and webhook_secret securely. Neither will be retrievable after this response. Rotate via the management endpoint if leaked.",
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("[OAuth Client] Registration error:", error);
        return NextResponse.json(
            { error: "Failed to register application" },
            { status: 500 },
        );
    }
}

/**
 * GET /api/auth/oauth-clients?client_id=cli_xxx
 *
 * Get application details (public info only, no secret)
 * This is used by the authorization server to validate client credentials
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const clientId = searchParams.get("client_id");

        if (!clientId) {
            return NextResponse.json(
                { error: "client_id is required" },
                { status: 400 },
            );
        }

        // Fetch from D1
        const db = await getDatabase();
        const client = await getOAuthClientById(db, clientId);
        if (!client) {
            return NextResponse.json(
                { error: "Client not found" },
                { status: 404 },
            );
        }

        // Return public client info (no secret!)
        return NextResponse.json({
            client_id: clientId,
            name: (client as any).name,
            description: (client as any).description || null,
            homepage_url: (client as any).homepage_url || null,
            redirect_uris: JSON.parse((client as any).redirect_uris || "[]"),
            scopes: JSON.parse((client as any).scopes || "[]"),
            created_at: (client as any).created_at,
            is_active: (client as any).is_active,
        });
    } catch (error) {
        console.error("[OAuth Client] Get error:", error);
        return NextResponse.json(
            { error: "Failed to get client details" },
            { status: 500 },
        );
    }
}
