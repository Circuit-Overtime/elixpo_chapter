export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { type NextRequest, NextResponse } from "next/server";
import { mintWebhookSecret } from "@/lib/app-webhooks";
import { getDatabase } from "@/lib/d1-client";
import { rotateOAuthClientWebhookSecret } from "@/lib/db";
import { verifyJWT } from "@/lib/jwt";

/**
 * POST /api/auth/oauth-clients/:client_id/webhook/rotate
 *
 * Mints a fresh per-app webhook secret. Plaintext is written to KV under
 * the dispatcher's lookup key BEFORE the D1 hash swap, so a webhook
 * firing during rotation either uses the new secret or fails verification
 * cleanly (never serves a stale-but-valid signature from a half-completed
 * rotation).
 *
 * Returns the new plaintext exactly once. Integrator updates their env
 * and re-deploys; old secret stops being honored the moment the D1 row
 * updates.
 *
 * Requires the app to already have a webhook configured (webhook_url set).
 * Use PATCH /webhook to set one first.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ client_id: string }> },
) {
    const token =
        request.cookies.get("access_token")?.value ||
        request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await verifyJWT(token);
    if (payload?.type !== "access")
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { client_id } = await params;
    const db = await getDatabase();

    // Ownership check — only the OAuth app's owner can rotate its secret.
    const owner = await db
        .prepare(
            "SELECT owner_id, webhook_url FROM oauth_clients WHERE client_id = ?",
        )
        .bind(client_id)
        .first<{ owner_id: string; webhook_url: string | null }>();
    if (!owner)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (owner.owner_id !== payload.sub)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!owner.webhook_url) {
        return NextResponse.json(
            {
                error: "No webhook configured. PATCH /webhook with webhook_url + webhook_events first.",
            },
            { status: 409 },
        );
    }

    // Mint, write KV first, then swap D1. If anything between KV-write and
    // D1-swap throws, the integrator can re-call rotate cleanly — the KV
    // value gets overwritten and the D1 hash hasn't yet changed.
    const { plaintext, hash } = await mintWebhookSecret();

    try {
        const kv = (getRequestContext().env as any).KV as KVNamespace;
        await kv.put(`webhook_secret:${client_id}`, plaintext);
    } catch (err) {
        console.error("[oauth webhook rotate] KV write failed:", err);
        return NextResponse.json(
            { error: "Secret store unavailable; retry" },
            { status: 503 },
        );
    }

    const ok = await rotateOAuthClientWebhookSecret(
        db,
        client_id,
        payload.sub,
        hash,
    );
    if (!ok) {
        // Try to roll back the KV write so the next rotate call starts
        // from a clean state. Best-effort — the rotation failed loudly
        // either way.
        try {
            const kv = (getRequestContext().env as any).KV as KVNamespace;
            await kv.delete(`webhook_secret:${client_id}`);
        } catch {
            /* swallow */
        }
        return NextResponse.json(
            { error: "Rotation failed" },
            { status: 500 },
        );
    }

    return NextResponse.json({
        webhook_secret: plaintext,
        rotated_at: new Date().toISOString(),
        _notice:
            "Store this secret. It will NOT be retrievable. The previous secret is now invalid.",
    });
}
