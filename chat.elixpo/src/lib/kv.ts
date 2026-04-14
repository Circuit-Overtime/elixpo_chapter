import { getCloudflareContext } from "@opennextjs/cloudflare";

const CACHE_TTL = 600; // 10 minutes in seconds

async function getKV(): Promise<KVNamespace> {
  const { env } = await getCloudflareContext();
  return env.KV;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const kv = await getKV();
  const value = await kv.get(key, "json");
  return value as T | null;
}

export async function setCache<T>(key: string, value: T, ttl = CACHE_TTL): Promise<void> {
  const kv = await getKV();
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
}
