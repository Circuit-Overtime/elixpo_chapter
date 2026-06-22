export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { verifyJWT } from "@/lib/jwt";

const KNOWN_TIERS = ["indie", "studio"] as const;
type PayableTier = (typeof KNOWN_TIERS)[number];

async function getAuth(request: NextRequest) {
    const token =
        request.cookies.get("access_token")?.value ||
        request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const payload = await verifyJWT(token);
    if (payload?.type !== "access") return null;
    return payload;
}

/**
 * POST /api/billing/checkout
 *
 * Initiates a payouts.elixpo checkout for the authenticated user.
 *
 * Body: { tier: "indie" | "studio" }
 * Response: { url: "https://payouts.elixpo.com/checkout?session=..." }
 *
 * The user is then redirected to the returned URL — payouts.elixpo's
 * hosted checkout collects the mandate and fires entitlement.updated back
 * to /api/webhooks/payouts/entitlement once activated.
 *
 * Refuses to start checkout if:
 *   - user is internal (no billing UI)
 *   - user is already on a paid tier (use /cancel + /checkout instead, or
 *     the dashboard will swap plans in a future iteration)
 */
export async function POST(request: NextRequest) {
    const auth = await getAuth(request);
    if (!auth)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const tier = String(body?.tier || "").toLowerCase();
    if (!KNOWN_TIERS.includes(tier as PayableTier)) {
        return NextResponse.json(
            { error: `Unknown tier '${tier}'. Must be one of: ${KNOWN_TIERS.join(", ")}` },
            { status: 400 },
        );
    }

    const apiBase = process.env.PAYOUTS_API_BASE || "https://payouts.elixpo.com";
    // Single source of truth — the payouts.elixpo app client secret
    // (lix_pay_…). Same env var name everywhere: .env.local, CF Pages
    // Production env, and GH repo secrets.
    const apiKey = process.env.ELIXPO_ACCOUNTS_PAYOUT_CLIENT_SECRET || "";
    if (!apiKey) {
        console.error(
            "[billing checkout] ELIXPO_ACCOUNTS_PAYOUT_CLIENT_SECRET not set",
        );
        return NextResponse.json(
            { error: "Billing is not configured. Try again later." },
            { status: 503 },
        );
    }

    const db = await getDatabase();
    const user = (await db
        .prepare(
            "SELECT id, email, tier, is_internal FROM users WHERE id = ?",
        )
        .bind(auth.sub)
        .first()) as {
        id: string;
        email: string;
        tier: string;
        is_internal: number;
    } | null;
    if (!user)
        return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.is_internal) {
        return NextResponse.json(
            { error: "Internal accounts don't use billing." },
            { status: 400 },
        );
    }
    if (user.tier !== "hobby") {
        return NextResponse.json(
            {
                error: `You're already on the ${user.tier} plan. Cancel the existing subscription before starting a new one.`,
            },
            { status: 409 },
        );
    }

    // Forward to payouts.elixpo. uid = our user id (becomes the
    // external_uid on Pay's side and comes back on every entitlement
    // webhook so we know which row to update).
    //
    // return_to: where payouts sends the user back — used for both
    // cancel and success. The caller (typically /pricing) tells us
    // where they came from so cancel feels like a real "back" button.
    // Validate it's same-origin to prevent open-redirect smuggling.
    const requestOrigin = new URL(request.url).origin;
    let successUrl = `${requestOrigin}/pricing`;
    const rawReturnTo = typeof body?.return_to === "string" ? body.return_to : "";
    if (rawReturnTo) {
        try {
            const u = new URL(rawReturnTo, requestOrigin);
            if (u.origin === requestOrigin) successUrl = u.toString();
        } catch {
            /* invalid URL — keep default */
        }
    }

    let payoutsResp: Response;
    try {
        payoutsResp = await fetch(`${apiBase}/v1/checkout/sessions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                tier,
                customer: { uid: user.id, email: user.email },
                currency: "INR",
                success_url: successUrl,
                metadata: {
                    source: "accounts.elixpo",
                    user_id: user.id,
                },
            }),
        });
    } catch (err) {
        console.error(
            "[billing checkout] payouts unreachable: %s",
            err instanceof Error ? err.message : String(err),
        );
        return NextResponse.json(
            { error: "Couldn't reach the billing service. Try again." },
            { status: 424 },
        );
    }

    const text = await payoutsResp.text();
    let data: any;
    try {
        data = JSON.parse(text);
    } catch {
        console.error(
            "[billing checkout] payouts returned non-JSON status=%s body=%s",
            String(payoutsResp.status),
            text.slice(0, 500),
        );
        return NextResponse.json(
            { error: "Billing service returned an invalid response." },
            { status: 424 },
        );
    }

    if (!payoutsResp.ok) {
        console.error(
            "[billing checkout] payouts error status=%s err=%s",
            String(payoutsResp.status),
            data?.error_description || data?.error || "unknown",
        );
        return NextResponse.json(
            {
                error:
                    data?.error_description ||
                    `Couldn't start checkout (${payoutsResp.status})`,
            },
            { status: 424 },
        );
    }

    return NextResponse.json({
        url: data.url,
        session_id: data.id,
        amount: data.amount,
        currency: data.currency,
        tier: data.tier,
    });
}
