/**
 * Seed Admin Account
 *
 * Creates the ayushman@elixpo.com admin account in Cloudflare D1.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requires environment variables:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_DATABASE_ID
 *   ADMIN_EMAIL (default: ayushman@elixpo.com)
 *   ADMIN_PASSWORD (required)
 */

import "dotenv/config";
import { pbkdf2Sync, randomBytes } from "crypto";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ayushman@elixpo.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
    console.error("ERROR: ADMIN_PASSWORD environment variable is required.");
    console.error('  export ADMIN_PASSWORD="your-secure-password"');
    process.exit(1);
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !DATABASE_ID) {
    console.error(
        "ERROR: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and CLOUDFLARE_DATABASE_ID are required.",
    );
    process.exit(1);
}

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`;

async function query(sql: string, params: (string | number | null)[] = []) {
    const res = await fetch(`${BASE_URL}/query`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql, params }),
    });
    if (!res.ok) {
        const err = (await res.json()) as any;
        throw new Error(
            `D1 error: ${err.errors?.[0]?.message || res.statusText}`,
        );
    }
    const data = (await res.json()) as any;
    return data.result?.[0];
}

function hashPassword(password: string): string {
    const salt = randomBytes(32).toString("hex");
    const hash = pbkdf2Sync(password, salt, 100000, 64, "sha256").toString(
        "hex",
    );
    return `${salt}:${hash}`;
}

function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

async function main() {
    console.log(`\nElixpo Admin Account Seed`);
    console.log(`=========================`);
    console.log(`Email    : ${ADMIN_EMAIL}`);
    console.log(`Database : ${DATABASE_ID}\n`);

    // Check if user already exists
    const existing = await query(
        "SELECT id, email, is_admin FROM users WHERE email = ?",
        [ADMIN_EMAIL],
    );
    const existingUser = existing?.results?.[0];

    if (existingUser) {
        if (existingUser.is_admin) {
            console.log(
                `Admin account already exists and already has admin privileges.`,
            );
            console.log(`  ID      : ${existingUser.id}`);
            console.log(`  Email   : ${existingUser.email}`);
            console.log(`  is_admin: true\n`);
        } else {
            // Promote to admin
            await query(
                `UPDATE users SET is_admin = 1, role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [existingUser.id],
            );
            console.log(`Existing account promoted to admin.`);
            console.log(`  ID    : ${existingUser.id}`);
            console.log(`  Email : ${existingUser.email}\n`);
        }
        return;
    }

    // Create user
    const userId = generateUUID();
    const passwordHash = hashPassword(ADMIN_PASSWORD!);
    const identityId = generateUUID();

    await query(
        `INSERT INTO users (id, email, password_hash, is_admin, is_active, role, email_verified)
     VALUES (?, ?, ?, 1, 1, 'admin', 1)`,
        [userId, ADMIN_EMAIL, passwordHash],
    );

    await query(
        `INSERT INTO identities (id, user_id, provider, provider_user_id, provider_email, verified)
     VALUES (?, ?, 'email', ?, ?, 1)`,
        [identityId, userId, ADMIN_EMAIL, ADMIN_EMAIL],
    );

    console.log(`Admin account created successfully.`);
    console.log(`  ID    : ${userId}`);
    console.log(`  Email : ${ADMIN_EMAIL}`);
    console.log(`  Role  : admin`);
    console.log(
        `\nLogin at: ${process.env.NEXT_PUBLIC_APP_URL || "https://accounts.elixpo.com"}/admin/login\n`,
    );
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
