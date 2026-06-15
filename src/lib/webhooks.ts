/**
 * Outbound webhook delivery (Elixpo Pay -> consuming app).
 *
 * ── Contract (consumer must verify) ─────────────────────────────────────────
 * POST <endpoint.url>
 *   Content-Type: application/json
 *   X-Elixpo-Pay-Event:     entitlement.updated
 *   X-Elixpo-Pay-Timestamp: <unix seconds>
 *   X-Elixpo-Pay-Signature: sha256=<hex HMAC of `${timestamp}.${rawBody}`>
 * Body: { id, type, created, data: <EntitlementView> }
 *
 * The consumer recomputes HMAC_SHA256(secret, `${timestamp}.${rawBody}`) with
 * the shared ELIXPO_PAY_WEBHOOK_SECRET and rejects on mismatch or stale ts.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { hmacSha256Hex } from "./crypto";
import type { EntitlementView } from "./entitlements";
import { getEnv } from "./env";
import { newId } from "./ids";

export interface WebhookEndpointRow {
    id: string;
    app_id: string;
    url: string;
    secret_ref: string;
    events: string;
}

export async function fireEntitlementUpdated(
    db: D1Database,
    endpoint: WebhookEndpointRow,
    data: EntitlementView,
): Promise<void> {
    const secret = await getEnv(endpoint.secret_ref);
    if (!secret) {
        console.error(
            `[webhook] missing secret env ${endpoint.secret_ref} for endpoint ${endpoint.id}`,
        );
        return;
    }

    const eventType = "entitlement.updated";
    const payload = {
        id: newId("webhookDelivery"),
        type: eventType,
        created: Math.floor(Date.now() / 1000),
        data,
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);

    const deliveryId = payload.id;
    await db
        .prepare(
            `INSERT INTO webhook_deliveries (id, endpoint_id, app_id, event_type, payload, status, attempts)
             VALUES (?, ?, ?, ?, ?, 'pending', 1)`,
        )
        .bind(deliveryId, endpoint.id, endpoint.app_id, eventType, rawBody)
        .run();

    try {
        const res = await fetch(endpoint.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Elixpo-Pay-Event": eventType,
                "X-Elixpo-Pay-Timestamp": timestamp,
                "X-Elixpo-Pay-Signature": `sha256=${signature}`,
            },
            body: rawBody,
        });
        const respBody = (await res.text().catch(() => "")).slice(0, 1000);
        await db
            .prepare(
                `UPDATE webhook_deliveries
                 SET status = ?, response_status = ?, response_body = ?, last_attempt_at = datetime('now')
                 WHERE id = ?`,
            )
            .bind(
                res.ok ? "delivered" : "failed",
                res.status,
                respBody,
                deliveryId,
            )
            .run();
    } catch (err: any) {
        await db
            .prepare(
                `UPDATE webhook_deliveries
                 SET status = 'failed', response_body = ?, last_attempt_at = datetime('now')
                 WHERE id = ?`,
            )
            .bind(String(err?.message || err).slice(0, 1000), deliveryId)
            .run();
    }
}
