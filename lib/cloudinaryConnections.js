import { decryptIntegrationSecret, encryptIntegrationSecret } from './integrationSecrets';

export const PLATFORM_CLOUDINARY = 'platform_cloudinary';
export const USER_CLOUDINARY = 'user_cloudinary';

export function parseCloudinaryUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || '').trim());
  } catch {
    throw new Error('Enter a valid cloudinary:// API environment URL');
  }
  if (parsed.protocol !== 'cloudinary:' || !parsed.username || !parsed.password || !parsed.hostname) {
    throw new Error('The Cloudinary URL must include an API key, API secret, and cloud name');
  }
  if (!/^[a-z][a-z0-9-]{1,127}$/i.test(parsed.hostname)) throw new Error('Invalid Cloudinary cloud name');
  return {
    cloudName: parsed.hostname,
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password),
  };
}

export async function saveCloudinaryConnection(db, userId, config) {
  const now = Math.floor(Date.now() / 1000);
  const encryptedSecret = await encryptIntegrationSecret(config.apiSecret);
  await db.prepare(`
    INSERT INTO cloudinary_connections
      (user_id, cloud_name, api_key, api_secret_encrypted, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      cloud_name = excluded.cloud_name,
      api_key = excluded.api_key,
      api_secret_encrypted = excluded.api_secret_encrypted,
      enabled = 1,
      updated_at = excluded.updated_at
  `).bind(userId, config.cloudName, config.apiKey, encryptedSecret, now, now).run();
}

export async function getUserCloudinaryConnection(db, userId, { includeDisabled = false } = {}) {
  const row = await db.prepare(`
    SELECT user_id, cloud_name, api_key, api_secret_encrypted, enabled, created_at, updated_at
    FROM cloudinary_connections WHERE user_id = ?
  `).bind(userId).first();
  if (!row || (!includeDisabled && !row.enabled)) return null;
  return {
    userId: row.user_id,
    cloudName: row.cloud_name,
    apiKey: row.api_key,
    apiSecret: await decryptIntegrationSecret(row.api_secret_encrypted),
    enabled: !!row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getStorageTarget(db, userId) {
  const connection = await getUserCloudinaryConnection(db, userId);
  if (!connection) return { provider: PLATFORM_CLOUDINARY, cloudName: null, config: null };
  return { provider: USER_CLOUDINARY, cloudName: connection.cloudName, config: connection };
}

export async function getMediaCloudinaryConfig(db, media) {
  if (media.storage_provider !== USER_CLOUDINARY) return null;
  const connection = await getUserCloudinaryConnection(db, media.user_id, { includeDisabled: true });
  if (!connection || connection.cloudName !== media.storage_cloud_name) {
    throw new Error('The creator Cloudinary connection is unavailable');
  }
  return connection;
}
