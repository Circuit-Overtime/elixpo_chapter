import { NextResponse } from 'next/server';

const VALID_ROLES = ['user', 'admin'] as const;
const VALID_TIERS = ['free', 'pro', 'business', 'enterprise'] as const;
const VALID_SCOPES = ['read', 'read,write'] as const;
const SAFE_PROTOCOLS = ['http:', 'https:'];

/** Validate a destination URL: must be http(s) and parseable */
export function validateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!SAFE_PROTOCOLS.includes(parsed.protocol)) return 'URL must use http or https';
    return null;
  } catch {
    return 'Invalid URL';
  }
}

/** Validate string length */
export function validateLength(value: string, field: string, min: number, max: number): string | null {
  if (value.length < min) return `${field} must be at least ${min} characters`;
  if (value.length > max) return `${field} must be at most ${max} characters`;
  return null;
}

/** Validate expires_at is in the future */
export function validateFutureDate(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date format';
  if (d <= new Date()) return 'Expiration must be in the future';
  return null;
}

/** Validate role value */
export function isValidRole(role: string): boolean {
  return (VALID_ROLES as readonly string[]).includes(role);
}

/** Validate tier value */
export function isValidTier(tier: string): boolean {
  return (VALID_TIERS as readonly string[]).includes(tier);
}

/** Validate scopes value */
export function isValidScopes(scopes: string): boolean {
  return (VALID_SCOPES as readonly string[]).includes(scopes);
}

/** Clamp a numeric query param to safe bounds */
export function clampInt(value: string | null, defaultVal: number, min: number, max: number): number {
  const n = parseInt(value || String(defaultVal));
  if (isNaN(n)) return defaultVal;
  return Math.max(min, Math.min(n, max));
}

/** Return a 400 JSON error response */
export function badRequest(msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status: 400 });
}
