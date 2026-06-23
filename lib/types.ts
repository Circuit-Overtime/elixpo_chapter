export type Tier = 'free' | 'pro' | 'business' | 'enterprise';

export interface TierLimits {
  maxUrls: number;
  maxApiKeys: number;
  maxClicksRetention: number;
  customCodes: boolean;
  analytics: boolean;
  expiringLinks: boolean;
  /** Team members included in the plan (-1 = unlimited). */
  seats: number;
  /** Branded/custom short domains included (-1 = unlimited). */
  brandedDomains: number;
  /** Outbound webhooks on link events. */
  webhooks: boolean;
  /** API requests/min ceiling (-1 = custom/unbounded). */
  rateLimitPerMin: number;
}

// -1 = unlimited. NOTE on enforcement: maxUrls, maxApiKeys, maxClicksRetention,
// customCodes, analytics, expiringLinks are enforced in the API today. seats,
// brandedDomains, webhooks, rateLimitPerMin define the plan and drive the
// pricing UI; their feature enforcement lands with those features.
export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free:       { maxUrls: 25,    maxApiKeys: 1,   maxClicksRetention: 7,   customCodes: false, analytics: false, expiringLinks: false, seats: 1,  brandedDomains: 0,  webhooks: false, rateLimitPerMin: 60 },
  pro:        { maxUrls: 1000,  maxApiKeys: 5,   maxClicksRetention: 30,  customCodes: true,  analytics: true,  expiringLinks: true,  seats: 1,  brandedDomains: 1,  webhooks: true,  rateLimitPerMin: 600 },
  business:   { maxUrls: 10000, maxApiKeys: 20,  maxClicksRetention: 365, customCodes: true,  analytics: true,  expiringLinks: true,  seats: 5,  brandedDomains: 3,  webhooks: true,  rateLimitPerMin: 6000 },
  enterprise: { maxUrls: -1,    maxApiKeys: 100, maxClicksRetention: 730, customCodes: true,  analytics: true,  expiringLinks: true,  seats: -1, brandedDomains: -1, webhooks: true,  rateLimitPerMin: -1 },
};

// ── Commercial pricing ────────────────────────────────────────────────
// Sellable self-serve tiers. `enterprise` is intentionally absent: it's a
// "contact us" custom deal, not a priced card. Amounts are major units
// (whole ₹ / $); annual = ~2 months free vs paying monthly. These mirror
// the Elixpo Pay catalog price ids (one per tier × currency × interval).
export type SellableTier = 'free' | 'pro' | 'business';
export type BillingCurrency = 'INR' | 'USD';
export type BillingInterval = 'monthly' | 'annual';

export interface TierPricing {
  name: string;
  tagline: string;
  /** Amount per currency × interval, in major units. */
  price: Record<BillingCurrency, Record<BillingInterval, number>>;
}

export const CURRENCY_SYMBOL: Record<BillingCurrency, string> = { INR: '₹', USD: '$' };

export const TIER_PRICING: Record<SellableTier, TierPricing> = {
  free: {
    name: 'Free',
    tagline: 'For personal projects and trying things out.',
    price: { INR: { monthly: 0, annual: 0 }, USD: { monthly: 0, annual: 0 } },
  },
  pro: {
    name: 'Pro',
    tagline: 'For makers shipping real apps.',
    price: { INR: { monthly: 299, annual: 2990 }, USD: { monthly: 5, annual: 50 } },
  },
  business: {
    name: 'Business',
    tagline: 'For teams that need seats, domains, and a year of history.',
    price: { INR: { monthly: 1499, annual: 14990 }, USD: { monthly: 19, annual: 190 } },
  },
};

export const SELLABLE_TIER_ORDER: SellableTier[] = ['free', 'pro', 'business'];

// B2B expansion: Business includes TIER_LIMITS.business.seats; additional
// seats bill at this rate per seat per month.
export const EXTRA_SEAT_PRICE: Record<BillingCurrency, number> = { INR: 249, USD: 3 };

export interface User {
  id: number;
  elixpo_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  tier: Tier;
  is_active: number;
  created_at: string;
  updated_at: string;
  // Billing state (migration 0003). Null until a paid subscription exists.
  tier_expires_at?: string | null;
  pay_subscription_id?: string | null;
  billing_status?: BillingStatus;
}

export type BillingStatus = 'none' | 'active' | 'past_due' | 'canceled';

export interface UrlRecord {
  id: number;
  user_id: number;
  short_code: string;
  original_url: string;
  title: string | null;
  is_active: number;
  clicks: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface ClickRecord {
  id: number;
  url_id: number;
  clicked_at: string;
  country: string | null;
  city: string | null;
  region: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referer: string | null;
  ip_hash: string | null;
}

export interface ApiKeyRecord {
  id: number;
  user_id: number;
  key_hash: string;
  key_prefix: string;
  name: string;
  scopes: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: number;
  created_at: string;
}

export interface ElixpoUserInfo {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  provider: string;
  emailVerified: boolean;
  avatar: string | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}
