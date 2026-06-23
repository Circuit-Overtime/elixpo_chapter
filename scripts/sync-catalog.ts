// Push the code-defined catalog to Elixpo Pay.
// Run by the `pay-catalog-sync` GitHub workflow (cron + on pricing changes),
// or locally: `npx tsx scripts/sync-catalog.ts`.
//
// Idempotent: a full PUT of the catalog. Re-running with unchanged pricing
// is a no-op on Pay's side; changing TIER_PRICING and merging re-syncs.
import { buildCatalog } from '../lib/billing/catalog';

async function main(): Promise<void> {
  const base = (process.env.ELIXPO_PAY_BASE_URL || 'https://payouts.elixpo.com').replace(/\/$/, '');
  const appId = process.env.ELIXPO_PAY_APP_ID;
  const secret = process.env.ELIXPO_PAY_OAUTH_SECRET;

  if (!appId || !secret) {
    console.error('Missing ELIXPO_PAY_APP_ID or ELIXPO_PAY_OAUTH_SECRET');
    process.exit(1);
  }

  const catalog = buildCatalog();

  const res = await fetch(`${base}/v1/apps/${appId}/catalog`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(catalog),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`Catalog sync failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const priceCount = catalog.products.reduce((n, p) => n + p.prices.length, 0);
  console.log(`Synced ${catalog.products.length} products / ${priceCount} prices to ${base}`);
  console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
