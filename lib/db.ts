import { getRequestContext } from '@cloudflare/next-on-pages';

export function getDB(): D1Database {
  return getRequestContext().env.DB;
}

export function getKV(): KVNamespace {
  return getRequestContext().env.KV;
}

export function getEnv() {
  const ctx = getRequestContext().env;
  return {
    DB: ctx.DB as D1Database,
    KV: ctx.KV as KVNamespace,
    NEXT_PUBLIC_ELIXPO_CLIENT_ID: (ctx as any).NEXT_PUBLIC_ELIXPO_CLIENT_ID || process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID || '',
    ELIXPO_CLIENT_SECRET: (ctx as any).ELIXPO_CLIENT_SECRET || process.env.ELIXPO_CLIENT_SECRET || '',
    BASE_URL: (ctx as any).BASE_URL || process.env.BASE_URL || '',
    SAFE_BROWSING_API_KEY: (ctx as any).SAFE_BROWSING_API_KEY || process.env.SAFE_BROWSING_API_KEY || '',
    // DEV-ONLY: when set (e.g. `pro` / `business` / `enterprise`),
    // every authenticated user is promoted to this tier in-memory. Used
    // for local QA of paid-only flows without mutating D1. Leave unset
    // in production.
    DEV_TIER_OVERRIDE: (ctx as any).DEV_TIER_OVERRIDE || process.env.DEV_TIER_OVERRIDE || '',
  };
}

/** Derive the origin from a request URL (works for both localhost and production) */
export function getOrigin(requestUrl: string): string {
  const { origin } = new URL(requestUrl);
  return origin; // e.g. http://localhost:3000 or https://url.elixpo.com
}
