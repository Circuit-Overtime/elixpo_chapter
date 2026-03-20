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
}

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
