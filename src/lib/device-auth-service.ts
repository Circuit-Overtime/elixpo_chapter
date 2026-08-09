/**
 * Device Authorization Grant (RFC 8628) service.
 *
 * accounts.elixpo#79 (part of #73) — protocol + persistence only. The
 * verification UI and the token-endpoint polling grant are separate,
 * downstream issues; this module is the shared foundation both will call
 * into.
 *
 * Hard rule: raw device_code and raw user_code are generated, returned to
 * the caller once, and then discarded. Only their SHA-256 hashes are ever
 * written to D1, logged, or placed in audit metadata.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { isLixBlogsScope } from "./lixblogs-scopes";
import { SUPPORTED_OAUTH_SCOPES } from "./oauth-scopes";
import { generateRandomString, generateUUID, hashString } from "./webcrypto";

const DEVICE_CODE_PREFIX = "dvc_";
const DEFAULT_EXPIRES_IN_SECONDS = 600; // 10 minutes — RFC 8628 typical range
const DEFAULT_INTERVAL_SECONDS = 5;
const MAX_CODE_GENERATION_ATTEMPTS = 5;

// Excludes visually ambiguous characters (0/O, 1/I/L) so a user transcribing
// the code from a second screen doesn't have to guess.
const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

export type DeviceAuthorizationError =
    | "invalid_request"
    | "invalid_client"
    | "invalid_scope"
    | "server_error";

export class DeviceAuthorizationRequestError extends Error {
    constructor(
        public readonly code: DeviceAuthorizationError,
        message: string,
    ) {
        super(message);
        this.name = "DeviceAuthorizationRequestError";
    }
}

export interface DeviceAuthorizationResult {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
}

/**
 * Cryptographically uniform pick from `alphabet` via rejection sampling
 * (same technique as `generateNumericOtp` in webcrypto.ts) — avoids the
 * modulo-bias CodeQL flags on `getRandomValues() % n`.
 */
function pickFromAlphabet(alphabet: string): string {
    const space = alphabet.length;
    // Largest multiple of `space` that fits in a byte, so rejection is rare.
    const limit = 256 - (256 % space);
    let byte: number;
    do {
        byte = crypto.getRandomValues(new Uint8Array(1))[0];
    } while (byte >= limit);
    return alphabet[byte % space];
}

/** Exported for unit testing (format/entropy/charset) — not part of the HTTP surface. */
export function generateRawUserCode(): string {
    const chars = Array.from({ length: 8 }, () =>
        pickFromAlphabet(USER_CODE_ALPHABET),
    );
    return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

/** Exported for unit testing (format/entropy/prefix) — not part of the HTTP surface. */
export function generateRawDeviceCode(): string {
    return `${DEVICE_CODE_PREFIX}${generateRandomString(32)}`;
}

/** Strip formatting and case so "wdjb mjht", "WDJB-MJHT", "wdjbmjht" all match. */
export function normalizeUserCode(input: string): string {
    return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function hashUserCode(rawUserCode: string): Promise<string> {
    return hashString(normalizeUserCode(rawUserCode));
}

function verificationUris(appUrl: string, userCode: string) {
    const verification_uri = `${appUrl}/device`;
    const verification_uri_complete = `${verification_uri}?user_code=${encodeURIComponent(userCode)}`;
    return { verification_uri, verification_uri_complete };
}

interface OAuthClientRow {
    client_id: string;
    client_type: string;
    is_active: number;
    scopes: string;
}

/**
 * Scopes valid platform-wide: core identity scopes (openid/profile/email)
 * plus every registered LixBlogs resource scope. A request must additionally
 * be a subset of the requesting client's own registered `scopes` — this is
 * just "is this scope string one we know how to describe/consent for at all".
 */
function isKnownScope(scope: string): boolean {
    return (
        (SUPPORTED_OAUTH_SCOPES as readonly string[]).includes(scope) ||
        isLixBlogsScope(scope)
    );
}

export interface CreateDeviceAuthorizationInput {
    clientId: string;
    /** Space-delimited requested scopes; falls back to the client's full registered grant when omitted. */
    scope?: string;
    audience?: string;
    ipAddress: string;
    appUrl: string;
}

export async function createDeviceAuthorization(
    db: D1Database,
    input: CreateDeviceAuthorizationInput,
): Promise<DeviceAuthorizationResult> {
    const { clientId, audience, ipAddress, appUrl } = input;

    if (!clientId) {
        throw new DeviceAuthorizationRequestError(
            "invalid_request",
            "client_id is required",
        );
    }

    const client = (await db
        .prepare(
            "SELECT client_id, client_type, is_active, scopes FROM oauth_clients WHERE client_id = ?",
        )
        .bind(clientId)
        .first()) as OAuthClientRow | null;

    // Same generic error whether the client doesn't exist, is inactive, or
    // is a confidential (non-device) client — don't leak which.
    if (client?.is_active !== 1 || client.client_type !== "public") {
        throw new DeviceAuthorizationRequestError(
            "invalid_client",
            "Unknown or ineligible client",
        );
    }

    const clientScopes: string[] = JSON.parse(client.scopes || "[]");
    const requestedScopes = input.scope
        ? [...new Set(input.scope.split(/\s+/).filter(Boolean))]
        : clientScopes;

    if (requestedScopes.length === 0) {
        throw new DeviceAuthorizationRequestError(
            "invalid_scope",
            "No scopes requested or registered for this client",
        );
    }

    const scopesValid = requestedScopes.every(
        (scope) => isKnownScope(scope) && clientScopes.includes(scope),
    );
    if (!scopesValid) {
        throw new DeviceAuthorizationRequestError(
            "invalid_scope",
            "Requested scope is not registered for this client",
        );
    }

    const expiresAt = new Date(
        Date.now() + DEFAULT_EXPIRES_IN_SECONDS * 1000,
    ).toISOString();

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
        const rawDeviceCode = generateRawDeviceCode();
        const rawUserCode = generateRawUserCode();
        const deviceCodeHash = await hashString(rawDeviceCode);
        const userCodeHash = await hashUserCode(rawUserCode);

        try {
            await db
                .prepare(
                    `INSERT INTO device_authorizations (
                        id, device_code_hash, user_code_hash, client_id, audience,
                        scopes, status, interval_seconds, ip_address, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
                )
                .bind(
                    generateUUID(),
                    deviceCodeHash,
                    userCodeHash,
                    clientId,
                    audience ?? null,
                    requestedScopes.join(" "),
                    DEFAULT_INTERVAL_SECONDS,
                    ipAddress,
                    expiresAt,
                )
                .run();

            const { verification_uri, verification_uri_complete } =
                verificationUris(appUrl, rawUserCode);

            return {
                device_code: rawDeviceCode,
                user_code: rawUserCode,
                verification_uri,
                verification_uri_complete,
                expires_in: DEFAULT_EXPIRES_IN_SECONDS,
                interval: DEFAULT_INTERVAL_SECONDS,
            };
        } catch (error) {
            // Unique-constraint collision on either hash — vanishingly
            // unlikely at this entropy, but retry with fresh codes rather
            // than fail the request.
            lastError = error;
        }
    }

    console.error(
        "[DeviceAuth] Failed to allocate a unique device/user code after retries:",
        lastError,
    );
    throw new DeviceAuthorizationRequestError(
        "server_error",
        "Failed to issue device authorization",
    );
}

export type DeviceAuthorizationLookupStatus =
    | "pending"
    | "approved"
    | "denied"
    | "expired"
    | "not_found";

export interface DeviceAuthorizationLookupResult {
    status: DeviceAuthorizationLookupStatus;
    client_id?: string;
    client_name?: string;
    scopes?: string[];
    expires_at?: string;
}

/**
 * Resolve a user-entered code for the (future) verification page. Read-only
 * — approval/denial is a separate, session-authenticated, CSRF-protected
 * action that belongs to that page's own issue, not here.
 */
export async function lookupDeviceAuthorizationByUserCode(
    db: D1Database,
    rawUserCode: string,
): Promise<DeviceAuthorizationLookupResult> {
    const userCodeHash = await hashUserCode(rawUserCode);

    const row = (await db
        .prepare(
            `SELECT da.status, da.expires_at, da.scopes, da.client_id, oc.name AS client_name
             FROM device_authorizations da
             JOIN oauth_clients oc ON oc.client_id = da.client_id
             WHERE da.user_code_hash = ?`,
        )
        .bind(userCodeHash)
        .first()) as {
        status: string;
        expires_at: string;
        scopes: string;
        client_id: string;
        client_name: string;
    } | null;

    if (!row) {
        return { status: "not_found" };
    }

    const expired = new Date(row.expires_at) <= new Date();

    return {
        status: expired
            ? "expired"
            : (row.status as DeviceAuthorizationLookupStatus),
        client_id: row.client_id,
        client_name: row.client_name,
        scopes: row.scopes.split(" ").filter(Boolean),
        expires_at: row.expires_at,
    };
}

/**
 * Bounded expiry cleanup. Deletes rows past `expires_at` in batches
 * so a single cron/cleanup tick can never lock the table for an unbounded
 * scan. Approved/denied rows are left in place for their natural expiry —
 * downstream token-polling logic (separate issue) still needs to answer
 * "expired_token" without retaining resolved grants indefinitely.
 */
export async function cleanupExpiredDeviceAuthorizations(
    db: D1Database,
    limit = 500,
): Promise<number> {
    const result = await db
        .prepare(
            `DELETE FROM device_authorizations
             WHERE id IN (
                SELECT id FROM device_authorizations
                WHERE expires_at < CURRENT_TIMESTAMP
                LIMIT ?
             )`,
        )
        .bind(limit)
        .run();

    return (result as any)?.meta?.changes ?? 0;
}
