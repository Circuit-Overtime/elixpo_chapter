/**
 * App-scoped webhook dispatch.
 *
 * Each OAuth app registers a webhook_url + set of subscribed event types at
 * registration time. The SSO mints a per-app secret, hashes it, and returns
 * the plaintext to the developer once.
 *
 * When an event fires (user.deleted, user.updated, ...), the dispatcher
 * finds every active OAuth app the user has authorized whose webhook_events
 * includes this event type, and POSTs a signed payload to each app.
 *
 * Signature format mirrors the ElixpoURL receiver and the public docs:
 *   X-Elixpo-Event-Id:  <uuid>
 *   X-Elixpo-Event:     user.deleted
 *   X-Elixpo-Timestamp: <unix-seconds>
 *   X-Elixpo-Signature: sha256=<hex>
 *
 *   hmac = HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
 *
 * Receivers reject signatures that don't match or timestamps that are
 * outside a ±5 minute window.
 */

import { getDatabase } from "./d1-client";

export type AppWebhookEvent =
    | "user.deleted"
    | "user.updated"
    | "app.revoked"
    | "app.authorized";

export const VALID_EVENTS: readonly AppWebhookEvent[] = [
    "user.deleted",
    "user.updated",
    "app.revoked",
    "app.authorized",
];

// ── Secret management ────────────────────────────────────────────────────

/**
 * Mint a fresh webhook secret. Returns { plaintext, hash }. Caller stores
 * `hash` in oauth_clients.webhook_secret_hash and returns `plaintext`
 * to the developer exactly once.
 */
export async function mintWebhookSecret(): Promise<{
    plaintext: string;
    hash: string;
}> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const plaintext = `whk_${bytesToHex(bytes)}`;
    const hash = await sha256Hex(plaintext);
    return { plaintext, hash };
}

async function sha256Hex(input: string): Promise<string> {
    const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(input),
    );
    return bytesToHex(new Uint8Array(buf));
}

function bytesToHex(bytes: Uint8Array): string {
    let out = "";
    for (const b of bytes) out += b.toString(16).padStart(2, "0");
    return out;
}

// ── Dispatcher ───────────────────────────────────────────────────────────

interface AppWebhookTarget {
    clientId: string;
    url: string;
    secretPlaintext: string; // we need the plaintext to sign; see note below
    events: AppWebhookEvent[];
}

/**
 * Fire an app-scoped event to every OAuth app that:
 *   1. The user has authorized (clientId in `authorizedClientIds`)
 *   2. Is active (is_active = 1)
 *   3. Has webhook_url configured
 *   4. Subscribes to `event` (event ∈ webhook_events)
 *
 * `authorizedClientIds` should come from the calling site (e.g. the
 * delete-account route already collects this from refresh_tokens).
 *
 * NOTE on secrets: the DB only stores the hash, but signing requires the
 * plaintext. The caller resolves this by passing in a `getSecretPlaintext`
 * function — usually a KV lookup that the registration / rotation flow
 * populated with a short-TTL cache, or a long-lived hot-secret cache the
 * platform team maintains. If the function returns null for a clientId,
 * that delivery is skipped and logged. This keeps us from needing to store
 * plaintext in D1.
 *
 * For the common case where you want a simple "secret stored in KV with
 * the hash as the key" pattern, see `defaultSecretResolver` below.
 */
export async function dispatchAppEvent(
    event: AppWebhookEvent,
    payload: Record<string, unknown>,
    authorizedClientIds: string[],
    getSecretPlaintext: (
        clientId: string,
        secretHash: string,
    ) => Promise<string | null>,
): Promise<{
    attempted: number;
    delivered: number;
    failed: number;
    skipped: number;
}> {
    if (authorizedClientIds.length === 0) {
        return { attempted: 0, delivered: 0, failed: 0, skipped: 0 };
    }

    const db = await getDatabase();

    // Single query for all candidate targets.
    const placeholders = authorizedClientIds.map(() => "?").join(",");
    const result = await db
        .prepare(
            `SELECT client_id, webhook_url, webhook_secret_hash, webhook_events
            FROM oauth_clients
            WHERE client_id IN (${placeholders})
                AND is_active = 1
                AND webhook_url IS NOT NULL
                AND webhook_secret_hash IS NOT NULL`,
        )
        .bind(...authorizedClientIds)
        .all();

    const candidates = ((result as any).results || []) as Array<{
        client_id: string;
        webhook_url: string;
        webhook_secret_hash: string;
        webhook_events: string | null;
    }>;

    const targets: AppWebhookTarget[] = [];
    let skipped = 0;

    for (const row of candidates) {
        let events: AppWebhookEvent[];
        try {
            events = row.webhook_events ? JSON.parse(row.webhook_events) : [];
        } catch {
            events = [];
        }
        if (!events.includes(event)) continue;

        const plaintext = await getSecretPlaintext(
            row.client_id,
            row.webhook_secret_hash,
        );
        if (!plaintext) {
            skipped++;
            console.warn(
                `[app-webhooks] no plaintext for ${row.client_id} — delivery skipped`,
            );
            continue;
        }

        targets.push({
            clientId: row.client_id,
            url: row.webhook_url,
            secretPlaintext: plaintext,
            events,
        });
    }

    const deliveries = await Promise.allSettled(
        targets.map((t) => deliverOne(t, event, payload)),
    );

    let delivered = 0;
    let failed = 0;
    for (const d of deliveries) {
        if (d.status === "fulfilled" && d.value) delivered++;
        else failed++;
    }

    // Stamp last_delivery_at on successful deliveries.
    const stamped = targets.filter((_, i) => deliveries[i].status === "fulfilled");
    if (stamped.length > 0) {
        const ph = stamped.map(() => "?").join(",");
        const now = new Date().toISOString();
        await db
            .prepare(
                `UPDATE oauth_clients SET webhook_last_delivery_at = ? WHERE client_id IN (${ph})`,
            )
            .bind(now, ...stamped.map((s) => s.clientId))
            .run()
            .catch(() => {});
    }

    return { attempted: targets.length, delivered, failed, skipped };
}

async function deliverOne(
    target: AppWebhookTarget,
    event: AppWebhookEvent,
    payload: Record<string, unknown>,
): Promise<boolean> {
    const eventId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify(payload);
    const signed = `${timestamp}.${body}`;

    const sig = await hmacSha256Hex(target.secretPlaintext, signed);

    const controller = new AbortController();
    const tm = setTimeout(() => controller.abort(), 5_000);

    try {
        const res = await fetch(target.url, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                "X-Elixpo-Event-Id": eventId,
                "X-Elixpo-Event": event,
                "X-Elixpo-Timestamp": timestamp,
                "X-Elixpo-Signature": `sha256=${sig}`,
            },
            body,
        });
        return res.ok;
    } catch (err) {
        console.warn(
            `[app-webhooks] delivery to ${target.url} failed:`,
            err instanceof Error ? err.message : err,
        );
        return false;
    } finally {
        clearTimeout(tm);
    }
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const sig = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(message),
    );
    return bytesToHex(new Uint8Array(sig));
}

// ── Default KV-backed secret resolver ────────────────────────────────────

/**
 * Build a secret resolver that reads `webhook_secret:<clientId>` from KV.
 *
 * Populate this key on registration and on rotation:
 *
 *   await env.KV.put(`webhook_secret:${clientId}`, plaintext);
 *
 * Plaintext is never written to D1 — D1 holds the SHA-256 hash and KV holds
 * the plaintext. KV is a tightly-scoped operational store; D1 is the
 * authoritative record. Losing the KV value means rotating the secret (and
 * the registered app updates their .env).
 */
export function defaultSecretResolver(
    kv: KVNamespace,
): (clientId: string, _hash: string) => Promise<string | null> {
    return async (clientId, _hash) => {
        try {
            return await kv.get(`webhook_secret:${clientId}`);
        } catch {
            return null;
        }
    };
}
