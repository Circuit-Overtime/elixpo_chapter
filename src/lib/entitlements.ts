/**
 * Entitlement state + grant application. This is the source of truth behind
 * both GET /v1/entitlements and the outbound entitlement.updated webhook.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { newId } from "./ids";

export interface EntitlementRow {
    id: string;
    app_id: string;
    external_uid: string;
    customer_id: string | null;
    subscription_id: string | null;
    tier: string;
    status: string;
    expires_at: string | null;
    version: number;
    updated_at: string;
}

export async function getEntitlement(
    db: D1Database,
    appId: string,
    externalUid: string,
): Promise<EntitlementRow | null> {
    return (await db
        .prepare(
            "SELECT * FROM entitlements WHERE app_id = ? AND external_uid = ?",
        )
        .bind(appId, externalUid)
        .first()) as EntitlementRow | null;
}

/**
 * The shape returned by GET /v1/entitlements and carried in the webhook.
 * `active` is computed against expiry so consumers don't have to.
 */
export interface EntitlementView {
    app: string;
    uid: string;
    tier: string;
    status: string;
    active: boolean;
    expires_at: string | null;
    version: number;
}

export function toView(
    appSlug: string,
    row: EntitlementRow | null,
    externalUid: string,
): EntitlementView {
    if (!row) {
        return {
            app: appSlug,
            uid: externalUid,
            tier: "free",
            status: "none",
            active: false,
            expires_at: null,
            version: 0,
        };
    }
    const notExpired =
        !row.expires_at || new Date(row.expires_at.replace(" ", "T") + "Z") > new Date();
    return {
        app: appSlug,
        uid: row.external_uid,
        tier: row.tier,
        status: row.status,
        active: row.status === "active" && notExpired,
        expires_at: row.expires_at,
        version: row.version,
    };
}

export interface ApplyGrantInput {
    appId: string;
    externalUid: string;
    customerId: string | null;
    subscriptionId: string | null;
    transactionId: string | null;
    tier: string;
    expiresAt: string | null;
    action?: "granted" | "renewed" | "revoked" | "expired";
}

/**
 * Upsert the entitlement to the granted tier/expiry, bump its monotonic
 * version, and write an immutable grant log row. Returns the new entitlement.
 */
export async function applyGrant(
    db: D1Database,
    input: ApplyGrantInput,
): Promise<EntitlementRow> {
    const existing = await getEntitlement(db, input.appId, input.externalUid);

    let entitlementId: string;
    let version: number;

    if (existing) {
        entitlementId = existing.id;
        version = existing.version + 1;
        await db
            .prepare(
                `UPDATE entitlements
                 SET tier = ?, status = 'active', expires_at = ?, customer_id = COALESCE(?, customer_id),
                     subscription_id = COALESCE(?, subscription_id), version = ?, updated_at = datetime('now')
                 WHERE id = ?`,
            )
            .bind(
                input.tier,
                input.expiresAt,
                input.customerId,
                input.subscriptionId,
                version,
                entitlementId,
            )
            .run();
    } else {
        entitlementId = newId("entitlement");
        version = 1;
        await db
            .prepare(
                `INSERT INTO entitlements
                 (id, app_id, external_uid, customer_id, subscription_id, tier, status, expires_at, version)
                 VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 1)`,
            )
            .bind(
                entitlementId,
                input.appId,
                input.externalUid,
                input.customerId,
                input.subscriptionId,
                input.tier,
                input.expiresAt,
            )
            .run();
    }

    await db
        .prepare(
            `INSERT INTO grants
             (id, entitlement_id, app_id, external_uid, transaction_id, subscription_id, tier, action, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
            newId("grant"),
            entitlementId,
            input.appId,
            input.externalUid,
            input.transactionId,
            input.subscriptionId,
            input.tier,
            input.action ?? (existing ? "renewed" : "granted"),
            input.expiresAt,
        )
        .run();

    return (await getEntitlement(
        db,
        input.appId,
        input.externalUid,
    )) as EntitlementRow;
}
