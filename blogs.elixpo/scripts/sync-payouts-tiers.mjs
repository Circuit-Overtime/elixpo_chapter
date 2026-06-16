#!/usr/bin/env node
// Sync blogs pricing tiers to Elixpo Pay so payouts.elixpo.com picks them up
// for its catalog (GET /v1/catalog?app=lixblogs). The actual charged amount is
// still computed per-region by blogs at checkout — this just keeps the central
// catalog in sync with what we sell.
//
// Usage:
//   ELIXPO_PAY_API_KEY=lix_pay_… node scripts/sync-payouts-tiers.mjs
//   (override target with PAYOUTS_SYNC_URL=http://localhost:3002)

import { PLANS, PRICE_BANDS } from "../lib/pricing.js";

const PAYOUTS = (process.env.PAYOUTS_SYNC_URL || "https://payouts.elixpo.com").replace(/\/$/, "");
const KEY = process.env.ELIXPO_PAY_API_KEY;

if (!KEY) {
  console.error("ERROR: ELIXPO_PAY_API_KEY is not set.");
  process.exit(1);
}

const toMinor = (major) => Math.round(Number(major) * 100);

// Representative catalog tiers: India (INR) + global headline (USD / T1 band).
// PPP bands (T2/T3) stay blogs-side and apply at checkout via the signed token.
function tiersFor(planId) {
  const out = [];
  const inr = PRICE_BANDS.IN?.[planId];
  const usd = PRICE_BANDS.T1?.[planId];
  if (inr) out.push({ nickname: "India", currency: "INR", unit_amount: toMinor(inr), interval: "month", region: "IN" });
  if (usd) out.push({ nickname: "Global", currency: "USD", unit_amount: toMinor(usd), interval: "month" });
  return out;
}

const paidPlans = PLANS.filter((p) => p.id !== "free");
let ok = 0;

for (const plan of paidPlans) {
  const body = {
    product: { tier: plan.id, name: `Blogs ${plan.name}`, description: plan.tagline || null },
    tiers: tiersFor(plan.id),
  };
  if (body.tiers.length === 0) {
    console.warn(`- ${plan.id}: no prices in PRICE_BANDS, skipping`);
    continue;
  }
  try {
    const res = await fetch(`${PAYOUTS}/v1/products`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`✓ ${plan.id} → ${data.tiers?.length ?? 0} tier(s) synced`);
      ok++;
    } else {
      console.error(`✗ ${plan.id}: HTTP ${res.status}`, JSON.stringify(data));
    }
  } catch (e) {
    console.error(`✗ ${plan.id}: ${e.message}`);
  }
}

console.log(`\nSynced ${ok}/${paidPlans.length} product(s) to ${PAYOUTS}`);
process.exit(ok === paidPlans.length ? 0 : 1);
