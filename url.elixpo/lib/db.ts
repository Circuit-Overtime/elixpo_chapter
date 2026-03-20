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
  };
}

/** Derive the origin from a request URL (works for both localhost and production) */
export function getOrigin(requestUrl: string): string {
  const { origin } = new URL(requestUrl);
  return origin; // e.g. http://localhost:3000 or https://url.elixpo.com
}
