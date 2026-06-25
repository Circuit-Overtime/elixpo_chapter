export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import type { D1Database } from "@cloudflare/workers-types";
import { requireDashboard } from "@/lib/dashboard-auth";
import { newId } from "@/lib/ids";

/**
 * Connected payout account (Razorpay Route) for the signed-in merchant.
 *
 *   GET    → current connection + status + routable revenue summary
 *   PUT    → connect / update bank details { beneficiary_name, account_number, ifsc, razorpay_account_id? }
 *   DELETE → disconnect
 *
 * Foundation stage: stores the connection and shows status. The live Razorpay
 * linked-account creation + split `transfers` are wired in a follow-up; until
 * the merchant's `razorpay_account_id` is set + active, funds keep settling to
 * the Elixpo platform account.
 */

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

async function getAccount(db: D1Database, merchantId: string): Promise<any | null> {
    return db
        .prepare("SELECT * FROM payout_accounts WHERE merchant_id = ?")
        .bind(merchantId)
        .first();
}

function view(row: any | null) {
    if (!row) return null;
    return {
        beneficiary_name: row.beneficiary_name,
        bank_ifsc: row.bank_ifsc,
        bank_last4: row.bank_last4,
        razorpay_account_id: row.razorpay_account_id,
        commission_bps: row.commission_bps,
        status: row.status, // pending | active | disabled
    };
}

export async function GET(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;

    const row = await getAccount(db, merchantId);

    // Revenue that would route to the merchant once Route is live (captured, by currency).
    const revenue = await db
        .prepare(
            `SELECT t.currency AS currency, COALESCE(SUM(t.amount), 0) AS total, COUNT(*) AS count
             FROM transactions t JOIN apps a ON t.app_id = a.id
             WHERE a.merchant_id = ? AND t.status = 'captured'
             GROUP BY t.currency`,
        )
        .bind(merchantId)
        .all();

    return NextResponse.json(
        { account: view(row), routable: revenue.results ?? [] },
        { headers: { "Cache-Control": "no-store" } },
    );
}

export async function PUT(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;

    const body: any = await request.json().catch(() => ({}));
    const beneficiary = String(body.beneficiary_name || "").trim().slice(0, 120);
    const ifsc = String(body.ifsc || "").trim().toUpperCase();
    const accountNumber = String(body.account_number || "").replace(/\s/g, "");
    const razorpayAccountId = body.razorpay_account_id
        ? String(body.razorpay_account_id).trim()
        : null;

    if (!beneficiary) {
        return NextResponse.json({ error: "missing_beneficiary" }, { status: 400 });
    }
    if (!IFSC_RE.test(ifsc)) {
        return NextResponse.json({ error: "invalid_ifsc" }, { status: 400 });
    }
    if (!/^\d{6,18}$/.test(accountNumber)) {
        return NextResponse.json({ error: "invalid_account_number" }, { status: 400 });
    }
    if (razorpayAccountId && !/^acc_[A-Za-z0-9]+$/.test(razorpayAccountId)) {
        return NextResponse.json({ error: "invalid_account_id" }, { status: 400 });
    }
    // Only the last 4 of the account number are persisted (display only).
    const last4 = accountNumber.slice(-4);
    // Active once a Razorpay linked account is attached; pending otherwise.
    const status = razorpayAccountId ? "active" : "pending";

    const existing = await getAccount(db, merchantId);
    if (existing) {
        await db
            .prepare(
                `UPDATE payout_accounts
                 SET beneficiary_name = ?, bank_ifsc = ?, bank_last4 = ?,
                     razorpay_account_id = ?, status = ?, updated_at = datetime('now')
                 WHERE merchant_id = ?`,
            )
            .bind(beneficiary, ifsc, last4, razorpayAccountId, status, merchantId)
            .run();
    } else {
        await db
            .prepare(
                `INSERT INTO payout_accounts
                 (id, merchant_id, provider, razorpay_account_id, beneficiary_name, bank_ifsc, bank_last4, status)
                 VALUES (?, ?, 'razorpay', ?, ?, ?, ?, ?)`,
            )
            .bind(newId("payoutAccount"), merchantId, razorpayAccountId, beneficiary, ifsc, last4, status)
            .run();
    }

    return NextResponse.json({ ok: true, account: view(await getAccount(db, merchantId)) });
}

export async function DELETE(request: NextRequest) {
    const ctx = await requireDashboard(request);
    if (ctx instanceof NextResponse) return ctx;
    const { db, merchantId } = ctx;
    await db.prepare("DELETE FROM payout_accounts WHERE merchant_id = ?").bind(merchantId).run();
    return NextResponse.json({ ok: true });
}
