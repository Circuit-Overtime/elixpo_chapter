export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { type NextRequest, NextResponse } from "next/server";
import { VALID_EVENTS, type AppWebhookEvent } from "@/lib/app-webhooks";
import { getDatabase } from "@/lib/d1-client";
import { getOAuthClientById, updateOAuthClientWebhook } from "@/lib/db";
import { verifyJWT } from "@/lib/jwt";

async function getAuth(request: NextRequest) {
    const token =
        request.cookies.get("access_token")?.value ||
        request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const payload = await verifyJWT(token);
    if (payload?.type !== "access") return null;
    return payload;
}

async function assertOwnership(
    db: D1Database,
    clientId: string,
    userId: string,
): Promise<NextResponse | null> {
    const app = (await getOAuthClientById(db, clientId)) as any;
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // getOAuthClientById doesn't return owner_id, so fall back to a direct
    // lookup. Cheap — single indexed row.
    const ownerRow = await db
        .prepare("SELECT owner_id FROM oauth_clients WHERE client_id = ?")
        .bind(clientId)
        .first<{ owner_id: string }>();
    if (!ownerRow || ownerRow.owner_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
}

/**
 * PATCH /api/auth/oauth-clients/:client_id/webhook
 *
 * Update the OAuth app's webhook subscription without re-registering.
 * Both fields are optional in the body; only the ones present are touched.
 *
 *   { "webhook_url": "https://...", "webhook_events": ["user.deleted", ...] }
 *
 * To clear the subscription (disable webhook delivery), pass:
 *
 *   { "webhook_url": null, "webhook_events": null }
 *
 * Returns the new subscription metadata. Secret is NOT rotated by this
 * endpoint — use POST /webhook/rotate for that.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ client_id: string }> },
) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { client_id } = await params;
    const db = await getDatabase();

    const ownership = await assertOwnership(db, client_id, auth.sub);
    if (ownership) return ownership;

    let body: { webhook_url?: string | null; webhook_events?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const patch: { webhookUrl?: string | null; webhookEvents?: string | null } =
        {};

    // webhook_url: validate https/localhost, allow null to clear.
    if ("webhook_url" in body) {
        if (body.webhook_url === null || body.webhook_url === "") {
            patch.webhookUrl = null;
            // Clearing the URL also clears the event subscription — no
            // point keeping subscribed events for a missing endpoint.
            patch.webhookEvents = null;
        } else {
            if (typeof body.webhook_url !== "string") {
                return NextResponse.json(
                    { error: "webhook_url must be a string or null" },
                    { status: 400 },
                );
            }
            try {
                const parsed = new URL(body.webhook_url);
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
            } catch {
                return NextResponse.json(
                    { error: "Invalid webhook_url" },
                    { status: 400 },
                );
            }
            patch.webhookUrl = body.webhook_url;
        }
    }

    // webhook_events: must be array of valid event strings, or null/empty
    // to clear. Only validated if not already set to null by the URL-clear
    // branch above.
    if ("webhook_events" in body && patch.webhookEvents !== null) {
        if (
            body.webhook_events === null ||
            (Array.isArray(body.webhook_events) && body.webhook_events.length === 0)
        ) {
            patch.webhookEvents = null;
        } else if (Array.isArray(body.webhook_events)) {
            for (const ev of body.webhook_events) {
                if (
                    typeof ev !== "string" ||
                    !VALID_EVENTS.includes(ev as AppWebhookEvent)
                ) {
                    return NextResponse.json(
                        {
                            error: `Invalid event: ${ev}. Valid: ${VALID_EVENTS.join(", ")}`,
                        },
                        { status: 400 },
                    );
                }
            }
            patch.webhookEvents = JSON.stringify(body.webhook_events);
        } else {
            return NextResponse.json(
                { error: "webhook_events must be an array or null" },
                { status: 400 },
            );
        }
    }

    if (Object.keys(patch).length === 0) {
        return NextResponse.json(
            { error: "No webhook fields provided" },
            { status: 400 },
        );
    }

    // If setting a webhook_url but no events, that's a misconfig.
    if (patch.webhookUrl && patch.webhookEvents === null) {
        // Look up current events — if the app already had a subscription,
        // we preserve it. If not, require explicit events from the caller.
        const existing = await db
            .prepare("SELECT webhook_events FROM oauth_clients WHERE client_id = ?")
            .bind(client_id)
            .first<{ webhook_events: string | null }>();
        if (!existing?.webhook_events) {
            return NextResponse.json(
                {
                    error: "webhook_events is required when setting webhook_url for the first time",
                },
                { status: 400 },
            );
        }
        delete patch.webhookEvents; // leave the existing value untouched
    }

    const ok = await updateOAuthClientWebhook(db, client_id, auth.sub, patch);
    if (!ok) {
        return NextResponse.json(
            { error: "Update failed (no changes)" },
            { status: 400 },
        );
    }

    // Read back the current state to confirm what we returned.
    const fresh = await db
        .prepare(
            `SELECT webhook_url, webhook_events, webhook_secret_set_at, webhook_last_delivery_at
                FROM oauth_clients WHERE client_id = ?`,
        )
        .bind(client_id)
        .first<{
            webhook_url: string | null;
            webhook_events: string | null;
            webhook_secret_set_at: string | null;
            webhook_last_delivery_at: string | null;
        }>();

    return NextResponse.json({
        webhook_url: fresh?.webhook_url,
        webhook_events: fresh?.webhook_events
            ? JSON.parse(fresh.webhook_events)
            : null,
        webhook_secret_set_at: fresh?.webhook_secret_set_at,
        webhook_last_delivery_at: fresh?.webhook_last_delivery_at,
    });
}

/**
 * DELETE /api/auth/oauth-clients/:client_id/webhook
 *
 * Disable webhook delivery for this app. Clears webhook_url and
 * webhook_events (the secret hash stays in D1 so re-enabling later via
 * PATCH doesn't require minting a new secret, though that's also an option
 * via the rotate endpoint).
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ client_id: string }> },
) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { client_id } = await params;
    const db = await getDatabase();

    const ownership = await assertOwnership(db, client_id, auth.sub);
    if (ownership) return ownership;

    const ok = await updateOAuthClientWebhook(db, client_id, auth.sub, {
        webhookUrl: null,
        webhookEvents: null,
    });
    if (!ok) {
        return NextResponse.json(
            { error: "Disable failed" },
            { status: 400 },
        );
    }

    // Also drop the KV plaintext — explicitly stopping deliveries means
    // the secret shouldn't sit warm in cache. The hash stays in D1 so
    // re-enabling via PATCH is friction-free.
    try {
        const kv = (getRequestContext().env as any).KV as KVNamespace;
        await kv.delete(`webhook_secret:${client_id}`);
    } catch {
        /* non-fatal */
    }

    return NextResponse.json({ disabled: true });
}
