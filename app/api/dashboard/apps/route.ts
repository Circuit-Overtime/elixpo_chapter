export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { sha256Hex } from "@/lib/crypto";
import { requireDashboard } from "@/lib/dashboard-auth";
import { newId } from "@/lib/ids";
import type { D1Database } from "@cloudflare/workers-types";

/** GET /api/dashboard/apps — list the merchant's apps. */
export async function GET(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;

    const apps = await db
        .prepare(
            `SELECT a.id, a.slug, a.name, a.description, a.homepage_url, a.pricing_url,
                    a.return_url, a.status, a.created_at,
                    (a.api_key_hash IS NOT NULL) AS has_key,
                    (SELECT COUNT(*) FROM products p WHERE p.app_id = a.id AND p.active = 1) AS products
             FROM apps a WHERE a.merchant_id = ? ORDER BY a.created_at`,
        )
        .bind(merchantId)
        .all();

    return NextResponse.json({ apps: apps.results ?? [] });
}

/** Turn a display name into a stable, URL-safe slug. */
function slugify(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 38);
}

async function uniqueSlug(db: D1Database, base: string): Promise<string> {
    let candidate = base.length >= 3 ? base : `${base}-app`.slice(0, 38);
    for (let i = 0; i < 6; i++) {
        const taken = await db
            .prepare("SELECT 1 FROM apps WHERE slug = ?")
            .bind(candidate)
            .first();
        if (!taken) return candidate;
        const suffix = crypto.randomUUID().slice(0, 4);
        candidate = `${base.slice(0, 33)}-${suffix}`;
    }
    return `app-${crypto.randomUUID().slice(0, 8)}`;
}

function validUrl(u: unknown): string | null {
    if (!u) return null;
    try {
        const url = new URL(String(u));
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.toString();
    } catch {
        return null;
    }
}

/**
 * POST /api/dashboard/apps — register an app. The slug is derived from the name
 * automatically (it's the immutable API identifier); merchants supply the
 * human-facing name, description, homepage URL and pricing URL. Returns the
 * secret key ONCE.
 */
export async function POST(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;

    const body: any = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const description = body.description ? String(body.description).trim().slice(0, 280) : null;
    const homepageUrl = validUrl(body.homepage_url);
    const pricingUrl = validUrl(body.pricing_url);

    if (name.length < 2) {
        return NextResponse.json(
            { error: "invalid_name", error_description: "App name must be at least 2 characters." },
            { status: 400 },
        );
    }
    if (body.homepage_url && !homepageUrl) {
        return NextResponse.json({ error: "invalid_homepage_url" }, { status: 400 });
    }
    if (body.pricing_url && !pricingUrl) {
        return NextResponse.json({ error: "invalid_pricing_url" }, { status: 400 });
    }

    const slug = await uniqueSlug(db, slugify(name));

    const apiKey = `pay_sk_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const apiKeyHash = await sha256Hex(apiKey);
    const id = newId("app");

    await db
        .prepare(
            `INSERT INTO apps (id, merchant_id, slug, name, description, homepage_url, pricing_url, api_key_hash, return_url, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        )
        .bind(id, merchantId, slug, name, description, homepageUrl, pricingUrl, apiKeyHash, pricingUrl)
        .run();

    return NextResponse.json({
        app: { id, slug, name, description, homepage_url: homepageUrl, pricing_url: pricingUrl },
        api_key: apiKey, // shown once
    });
}
