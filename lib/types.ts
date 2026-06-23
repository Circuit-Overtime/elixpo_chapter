export type Tier = 'free' | 'pro' | 'business' | 'enterprise';

export interface TierLimits {
  maxUrls: number;
  maxApiKeys: number;
  maxClicksRetention: number;
  customCodes: boolean;
  analytics: boolean;
  expiringLinks: boolean;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { maxUrls: 25, maxApiKeys: 1, maxClicksRetention: 7, customCodes: false, analytics: false, expiringLinks: false },
  pro: { maxUrls: 500, maxApiKeys: 5, maxClicksRetention: 30, customCodes: true, analytics: true, expiringLinks: true },
  business: { maxUrls: 5000, maxApiKeys: 20, maxClicksRetention: 90, customCodes: true, analytics: true, expiringLinks: true },
  enterprise: { maxUrls: -1, maxApiKeys: 100, maxClicksRetention: 365, customCodes: true, analytics: true, expiringLinks: true },
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
    tagline: 'For teams that need headroom and longer history.',
    price: { INR: { monthly: 999, annual: 9990 }, USD: { monthly: 15, annual: 150 } },
  },
};

export const SELLABLE_TIER_ORDER: SellableTier[] = ['free', 'pro', 'business'];

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
