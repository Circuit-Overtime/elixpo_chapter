// ── Elixpo Pay catalog — single source of truth ───────────────────────
// The sellable catalog (products + prices) is defined HERE in code and
// pushed to Elixpo Pay by the `pay-catalog-sync` GitHub workflow. We never
// hand-maintain price ids as env vars: ids are deterministic and prices
// derive from TIER_PRICING, so the storefront, checkout, and Pay catalog
// can never drift apart.
//
// Relative import (not `@/…`) so the sync script can run under `tsx` in CI
// without tsconfig path resolution.
import {
  type BillingCurrency,
  type BillingInterval,
  type SellableTier,
  TIER_PRICING,
} from '../types';

/** App id under your Elixpo Pay merchant. Mirrors ELIXPO_PAY_APP_ID. */
export const PAY_APP = 'lixurl';

const CURRENCIES: BillingCurrency[] = ['INR', 'USD'];
const INTERVALS: BillingInterval[] = ['monthly', 'annual'];
/** Only paid tiers are sold through Pay; `free` has no catalog entry. */
const PAID_TIERS: SellableTier[] = ['pro', 'business'];

/** Deterministic price id, e.g. `pro_inr_monthly`. Used by checkout + sync. */
export function priceId(
  tier: SellableTier,
  currency: BillingCurrency,
  interval: BillingInterval,
): string {
  return `${tier}_${currency.toLowerCase()}_${interval}`;
}

export function intervalDays(interval: BillingInterval): number {
  return interval === 'monthly' ? 30 : 365;
}

export interface CatalogPrice {
  id: string;
  currency: BillingCurrency;
  /** Minor units (paise / cents). */
  amount: number;
  /** All paid tiers bill on autopay. */
  type: 'recurring';
  interval_days: number;
}

export interface CatalogProduct {
  id: SellableTier;
  name: string;
  prices: CatalogPrice[];
}

export interface Catalog {
  app: string;
  products: CatalogProduct[];
}

/**
 * Build the full catalog payload — i.e. the contents of payouts.catalog.json
 * that get POSTed to Elixpo Pay's /v1/sync. `app` defaults to PAY_APP but the
 * sync script passes ELIXPO_PAY_APP_ID so the body matches the configured app.
 */
export function buildCatalog(app: string = PAY_APP): Catalog {
  const products: CatalogProduct[] = PAID_TIERS.map((tier) => ({
    id: tier,
    name: TIER_PRICING[tier].name,
    prices: CURRENCIES.flatMap((currency) =>
      INTERVALS.map((interval) => ({
        id: priceId(tier, currency, interval),
        currency,
        amount: TIER_PRICING[tier].price[currency][interval] * 100,
        type: 'recurring' as const,
        interval_days: intervalDays(interval),
      })),
    ),
  }));
  return { app, products };
}
