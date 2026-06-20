/**
 * Thin data-access helpers over D1. Loose typing at the DB boundary (matches
 * accounts.elixpo); callers narrow as needed.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { isoDaysFromNow, newId, nowIso } from "./ids";

export interface AppRow {
    id: string;
    merchant_id: string;
    slug: string;
    name: string;
    api_key_hash: string | null;
    return_url: string | null;
    status: string;
}

export async function getAppBySlug(
    db: D1Database,
    slug: string,
): Promise<AppRow | null> {
    // Resolve by current slug, or a previous slug still inside its grace window.
    return (await db
        .prepare(
            `SELECT * FROM apps
             WHERE status = 'active'
               AND (slug = ?1
                    OR (prev_slug = ?1
                        AND prev_slug_expires_at IS NOT NULL
                        AND prev_slug_expires_at > datetime('now')))`,
        )
        .bind(slug)
        .first()) as AppRow | null;
}

export interface PriceRow {
    id: string;
    product_id: string;
    currency: string;
    unit_amount: number;
    type: string;
    interval: string;
    interval_count: number;
    provider: string;
}

export interface ProductRow {
    id: string;
    app_id: string;
    name: string;
    tier: string;
}

/** Resolve the product (by tier) + a matching active price (by currency). */
export async function resolveProductAndPrice(
    db: D1Database,
    appId: string,
    tier: string,
    currency: string,
): Promise<{ product: ProductRow; price: PriceRow | null } | null> {
    const product = (await db
        .prepare(
            "SELECT * FROM products WHERE app_id = ? AND tier = ? AND active = 1",
        )
        .bind(appId, tier)
        .first()) as ProductRow | null;
    if (!product) return null;

    const price = (await db
        .prepare(
            "SELECT * FROM prices WHERE product_id = ? AND currency = ? AND active = 1 ORDER BY created_at LIMIT 1",
        )
        .bind(product.id, currency)
        .first()) as PriceRow | null;

    return { product, price };
}

export async function upsertCustomer(
    db: D1Database,
    appId: string,
    externalUid: string,
    email?: string | null,
): Promise<string> {
    const existing = (await db
        .prepare(
            "SELECT id FROM customers WHERE app_id = ? AND external_uid = ?",
        )
        .bind(appId, externalUid)
        .first()) as { id: string } | null;
    if (existing) {
        if (email) {
            await db
                .prepare(
                    "UPDATE customers SET email = COALESCE(?, email) WHERE id = ?",
                )
                .bind(email, existing.id)
                .run();
        }
        return existing.id;
    }
    const id = newId("customer");
    await db
        .prepare(
            "INSERT INTO customers (id, app_id, external_uid, email) VALUES (?, ?, ?, ?)",
        )
        .bind(id, appId, externalUid, email ?? null)
        .run();
    return id;
}

export interface CreateCheckoutSessionInput {
    appId: string;
    customerId: string;
    externalUid: string;
    productId: string | null;
    priceId: string | null;
    currency: string;
    amount: number;
    returnUrl: string | null;
    metadata?: Record<string, unknown>;
    expiresInMinutes?: number;
}

export async function createCheckoutSession(
    db: D1Database,
    input: CreateCheckoutSessionInput,
): Promise<string> {
    const id = newId("checkoutSession");
    const expiresAt = new Date(
        Date.now() + (input.expiresInMinutes ?? 30) * 60_000,
    )
        .toISOString()
        .replace("T", " ")
        .slice(0, 19);
    await db
        .prepare(
            `INSERT INTO checkout_sessions
             (id, app_id, customer_id, external_uid, product_id, price_id, provider,
              currency, amount, status, return_url, metadata, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, 'razorpay', ?, ?, 'open', ?, ?, ?)`,
        )
        .bind(
            id,
            input.appId,
            input.customerId,
            input.externalUid,
            input.productId,
            input.priceId,
            input.currency,
            input.amount,
            input.returnUrl,
            input.metadata ? JSON.stringify(input.metadata) : null,
            expiresAt,
        )
        .run();
    return id;
}

export async function getCheckoutSession(
    db: D1Database,
    id: string,
): Promise<any | null> {
    return db
        .prepare("SELECT * FROM checkout_sessions WHERE id = ?")
        .bind(id)
        .first();
}

export async function getCheckoutSessionByOrder(
    db: D1Database,
    providerOrderId: string,
): Promise<any | null> {
    return db
        .prepare("SELECT * FROM checkout_sessions WHERE provider_order_id = ?")
        .bind(providerOrderId)
        .first();
}

export async function setSessionOrder(
    db: D1Database,
    sessionId: string,
    providerOrderId: string,
): Promise<void> {
    await db
        .prepare(
            "UPDATE checkout_sessions SET provider_order_id = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(providerOrderId, sessionId)
        .run();
}

export async function completeSession(
    db: D1Database,
    sessionId: string,
    transactionId: string,
): Promise<void> {
    await db
        .prepare(
            "UPDATE checkout_sessions SET status = 'completed', transaction_id = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(transactionId, sessionId)
        .run();
}

export interface RecordTransactionInput {
    appId: string;
    customerId: string | null;
    checkoutSessionId: string | null;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    currency: string;
    amount: number;
    status: string;
    raw?: unknown;
}

/**
 * Insert a captured transaction idempotently. If a row already exists for this
 * (provider, provider_payment_id), returns { id, created: false } so the caller
 * can skip re-fulfillment.
 */
export async function recordTransaction(
    db: D1Database,
    input: RecordTransactionInput,
): Promise<{ id: string; created: boolean }> {
    if (input.providerPaymentId) {
        const existing = (await db
            .prepare(
                "SELECT id FROM transactions WHERE provider = 'razorpay' AND provider_payment_id = ?",
            )
            .bind(input.providerPaymentId)
            .first()) as { id: string } | null;
        if (existing) return { id: existing.id, created: false };
    }

    const id = newId("transaction");
    await db
        .prepare(
            `INSERT INTO transactions
             (id, app_id, customer_id, checkout_session_id, provider, provider_order_id,
              provider_payment_id, currency, amount, status, raw)
             VALUES (?, ?, ?, ?, 'razorpay', ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            id,
            input.appId,
            input.customerId,
            input.checkoutSessionId,
            input.providerOrderId,
            input.providerPaymentId,
            input.currency,
            input.amount,
            input.status,
            input.raw ? JSON.stringify(input.raw) : null,
        )
        .run();
    return { id, created: true };
}

/** Write a minimal balanced ledger pair for a captured charge. */
export async function recordRevenueLedger(
    db: D1Database,
    appId: string,
    transactionId: string,
    currency: string,
    amount: number,
): Promise<void> {
    const group = newId("ledgerGroup");
    const credit = newId("ledger");
    const debit = newId("ledger");
    await db
        .prepare(
            `INSERT INTO ledger_entries (id, app_id, transaction_id, account, direction, currency, amount, group_id)
             VALUES (?, ?, ?, 'customer_paid', 'debit', ?, ?, ?)`,
        )
        .bind(debit, appId, transactionId, currency, amount, group)
        .run();
    await db
        .prepare(
            `INSERT INTO ledger_entries (id, app_id, transaction_id, account, direction, currency, amount, group_id)
             VALUES (?, ?, ?, 'platform_revenue', 'credit', ?, ?, ?)`,
        )
        .bind(credit, appId, transactionId, currency, amount, group)
        .run();
}

/** Upsert a one-time subscription, rolling current_period_end forward. */
export async function upsertOneTimeSubscription(
    db: D1Database,
    params: {
        appId: string;
        customerId: string;
        productId: string | null;
        priceId: string | null;
        tier: string;
        periodDays: number;
    },
): Promise<{ id: string; periodEnd: string }> {
    const periodStart = nowIso();
    const periodEnd = isoDaysFromNow(params.periodDays);

    const existing = (await db
        .prepare(
            "SELECT id FROM subscriptions WHERE app_id = ? AND customer_id = ? AND tier = ?",
        )
        .bind(params.appId, params.customerId, params.tier)
        .first()) as { id: string } | null;

    if (existing) {
        await db
            .prepare(
                `UPDATE subscriptions
                 SET status = 'active', current_period_start = ?, current_period_end = ?,
                     price_id = COALESCE(?, price_id), updated_at = datetime('now')
                 WHERE id = ?`,
            )
            .bind(periodStart, periodEnd, params.priceId, existing.id)
            .run();
        return { id: existing.id, periodEnd };
    }

    const id = newId("subscription");
    await db
        .prepare(
            `INSERT INTO subscriptions
             (id, app_id, customer_id, product_id, price_id, tier, status, billing_mode,
              current_period_start, current_period_end)
             VALUES (?, ?, ?, ?, ?, ?, 'active', 'one_time', ?, ?)`,
        )
        .bind(
            id,
            params.appId,
            params.customerId,
            params.productId,
            params.priceId,
            params.tier,
            periodStart,
            periodEnd,
        )
        .run();
    return { id, periodEnd };
}

export async function getWebhookEndpoint(
    db: D1Database,
    appId: string,
): Promise<any | null> {
    return db
        .prepare(
            "SELECT * FROM webhook_endpoints WHERE app_id = ? AND status = 'active' ORDER BY created_at LIMIT 1",
        )
        .bind(appId)
        .first();
}

export async function recordProviderEvent(
    db: D1Database,
    provider: string,
    providerEventId: string | null,
    eventType: string,
    payload: string,
): Promise<{ alreadySeen: boolean }> {
    if (providerEventId) {
        const existing = await db
            .prepare(
                "SELECT id FROM provider_webhook_events WHERE provider = ? AND provider_event_id = ?",
            )
            .bind(provider, providerEventId)
            .first();
        if (existing) return { alreadySeen: true };
    }
    await db
        .prepare(
            `INSERT INTO provider_webhook_events (id, provider, provider_event_id, event_type, status, payload)
             VALUES (?, ?, ?, ?, 'received', ?)`,
        )
        .bind(newId("providerWebhookEvent"), provider, providerEventId, eventType, payload)
        .run();
    return { alreadySeen: false };
}
