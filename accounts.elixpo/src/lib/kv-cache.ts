import type { KVNamespace } from '@cloudflare/workers-types';

function getKV(): KVNamespace | null {
  return (globalThis as any).env?.KV ?? null;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const kv = getKV();
  if (!kv) return null;
  try {
    const val = await kv.get(key, 'json');
    return val as T | null;
  } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  } catch { /* non-fatal */ }
}

export async function cacheDel(key: string): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try { await kv.delete(key); } catch { /* non-fatal */ }
}

export async function cacheGetOrSet<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fn();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
