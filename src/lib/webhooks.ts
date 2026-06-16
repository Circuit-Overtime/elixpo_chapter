/**
 * Outbound webhook delivery (Elixpo Pay -> consuming app).
 *
 * ── Contract (consumer must verify) ─────────────────────────────────────────
 * POST <endpoint.url>
 *   Content-Type: application/json
 *   X-Elixpo-Pay-Event:     <event type, e.g. entitlement.updated>
 *   X-Elixpo-Pay-Timestamp: <unix seconds>
 *   X-Elixpo-Pay-Signature: sha256=<hex HMAC of `${timestamp}.${rawBody}`>
 * Body: { id, type, created, data }
 *
 * The consumer recomputes HMAC_SHA256(secret, `${timestamp}.${rawBody}`) with
 * its per-app signing secret (`whsec_…`, shown in the merchant dashboard) and
 * rejects on mismatch or stale ts. Older endpoints without a stored
 * signing_secret fall back to the env var named by `secret_ref`.
 *
 * Each endpoint subscribes to a SUBSET of event types (the `events` column).
 * We only deliver an event the endpoint is subscribed to — so a merchant can
 * receive just the fulfillment event, or also opt into payment notifications.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { hmacSha256Hex } from "./crypto";
import type { EntitlementView } from "./entitlements";
import { getEnv } from "./env";
import { newId } from "./ids";

/**
 * The events Elixpo Pay can emit. Surfaced in the dashboard so merchants pick
 * which to receive. Keep in sync with the docs (app/docs/webhooks).
 */
export const WEBHOOK_EVENT_TYPES = [
    {
        type: "entitlement.updated",
        label: "Entitlement updated",
        description:
            "A buyer's access was granted, changed, or expired. Required to fulfill purchases.",
        required: true,
    },
    {
        type: "payment.captured",
        label: "Payment captured",
        description:
            "A payment succeeded. Useful for receipts, analytics, or your own ledger.",
        required: false,
    },
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]["type"];

const KNOWN_EVENTS = new Set(WEBHOOK_EVENT_TYPES.map((e) => e.type));
const REQUIRED_EVENTS = WEBHOOK_EVENT_TYPES.filter((e) => e.required).map(
    (e) => e.type,
);

/** Parse the stored `events` JSON, falling back to the required set. */
export function parseEvents(raw: string | null | undefined): string[] {
    if (!raw) return [...REQUIRED_EVENTS];
    try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter((e) => typeof e === "string");
    } catch {
        // ignore
    }
    return [...REQUIRED_EVENTS];
}

/** Sanitise a requested subscription: keep known events, always keep required. */
export function normaliseEvents(requested: unknown): string[] {
    const set = new Set<string>(REQUIRED_EVENTS);
    if (Array.isArray(requested)) {
        for (const e of requested) {
            if (typeof e === "string" && KNOWN_EVENTS.has(e as WebhookEventType)) {
                set.add(e);
            }
        }
    }
    return [...set];
}

export interface WebhookEndpointRow {
    id: string;
    app_id: string;
    url: string;
    secret_ref: string;
    signing_secret?: string | null;
    events: string;
}

/**
 * Resolve the HMAC secret for an endpoint. Prefer the per-app `signing_secret`
 * stored on the row (Stripe-style `whsec_…`); fall back to the env var named by
 * `secret_ref` for legacy endpoints created before per-app secrets existed.
 */
async function endpointSecret(
    endpoint: WebhookEndpointRow,
): Promise<string | null> {
    if (endpoint.signing_secret) return endpoint.signing_secret;
    if (endpoint.secret_ref) return (await getEnv(endpoint.secret_ref)) ?? null;
    return null;
}

/**
 * Sign and deliver one event to an endpoint, recording the attempt. No-op if
 * the endpoint isn't subscribed to `eventType`.
 */
export async function fireWebhook(
    db: D1Database,
    endpoint: WebhookEndpointRow,
    eventType: WebhookEventType,
    data: unknown,
): Promise<void> {
    if (!parseEvents(endpoint.events).includes(eventType)) {
        return; // not subscribed — skip silently
    }

    const secret = await endpointSecret(endpoint);
    if (!secret) {
        console.error(
            `[webhook] no signing secret for endpoint ${endpoint.id} (app ${endpoint.app_id})`,
        );
        return;
    }

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

/** Deliver the fulfillment event (access granted/changed/expired). */
export async function fireEntitlementUpdated(
    db: D1Database,
    endpoint: WebhookEndpointRow,
    data: EntitlementView,
): Promise<void> {
    await fireWebhook(db, endpoint, "entitlement.updated", data);
}

export interface PaymentCapturedData {
    app: string;
    uid: string;
    transaction_id: string;
    provider_payment_id: string | null;
    provider_order_id: string | null;
    currency: string;
    amount: number;
    tier: string;
}

/** Deliver the optional payment-captured notification. */
export async function firePaymentCaptured(
    db: D1Database,
    endpoint: WebhookEndpointRow,
    data: PaymentCapturedData,
): Promise<void> {
    await fireWebhook(db, endpoint, "payment.captured", data);
}
