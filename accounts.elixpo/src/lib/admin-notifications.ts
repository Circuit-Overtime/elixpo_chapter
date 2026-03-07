import type { D1Database } from '@cloudflare/workers-types';

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  resource_id?: string;
  resource_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminNotificationSettings {
  email_new_user: boolean;
  email_new_oauth_app: boolean;
  email_new_api_key: boolean;
  email_suspicious_login: boolean;
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly';
  admin_email: string | null;
}

export async function createAdminNotification(
  db: D1Database,
  type: string,
  title: string,
  message: string,
  resourceId?: string,
  resourceType?: string
): Promise<void> {
  const { generateUUID } = await import('./webcrypto');
  const id = generateUUID();
  await db
    .prepare(
      `INSERT INTO admin_notifications (id, type, title, message, resource_id, resource_type)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, type, title, message, resourceId || null, resourceType || null)
    .run();
}

export async function getAdminNotifications(
  db: D1Database,
  unreadOnly = false,
  limit = 20
): Promise<AdminNotification[]> {
  const query = unreadOnly
    ? `SELECT * FROM admin_notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT ?`;
  const result = await db.prepare(query).bind(limit).all();
  return (result.results || []) as unknown as AdminNotification[];
}

export async function countUnreadNotifications(db: D1Database): Promise<number> {
  const result = await db
    .prepare(`SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = 0`)
    .first() as any;
  return result?.count ?? 0;
}

export async function markNotificationRead(db: D1Database, id: string): Promise<void> {
  await db
    .prepare(`UPDATE admin_notifications SET is_read = 1 WHERE id = ?`)
    .bind(id)
    .run();
}

export async function markAllNotificationsRead(db: D1Database): Promise<void> {
  await db.prepare(`UPDATE admin_notifications SET is_read = 1`).run();
}

export async function getNotificationSettings(db: D1Database): Promise<AdminNotificationSettings> {
  const result = await db
    .prepare(`SELECT * FROM admin_notification_settings WHERE id = 'singleton'`)
    .first() as any;
  return {
    email_new_user: Boolean(result?.email_new_user ?? 1),
    email_new_oauth_app: Boolean(result?.email_new_oauth_app ?? 1),
    email_new_api_key: Boolean(result?.email_new_api_key ?? 0),
    email_suspicious_login: Boolean(result?.email_suspicious_login ?? 1),
    digest_enabled: Boolean(result?.digest_enabled ?? 0),
    digest_frequency: (result?.digest_frequency ?? 'weekly') as 'daily' | 'weekly',
    admin_email: result?.admin_email ?? null,
  };
}

export async function updateNotificationSettings(
  db: D1Database,
  settings: Partial<AdminNotificationSettings>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (settings.email_new_user !== undefined) { fields.push('email_new_user = ?'); values.push(settings.email_new_user ? 1 : 0); }
  if (settings.email_new_oauth_app !== undefined) { fields.push('email_new_oauth_app = ?'); values.push(settings.email_new_oauth_app ? 1 : 0); }
  if (settings.email_new_api_key !== undefined) { fields.push('email_new_api_key = ?'); values.push(settings.email_new_api_key ? 1 : 0); }
  if (settings.email_suspicious_login !== undefined) { fields.push('email_suspicious_login = ?'); values.push(settings.email_suspicious_login ? 1 : 0); }
  if (settings.digest_enabled !== undefined) { fields.push('digest_enabled = ?'); values.push(settings.digest_enabled ? 1 : 0); }
  if (settings.digest_frequency !== undefined) { fields.push('digest_frequency = ?'); values.push(settings.digest_frequency); }
  if (settings.admin_email !== undefined) { fields.push('admin_email = ?'); values.push(settings.admin_email); }
  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  await db.prepare(`UPDATE admin_notification_settings SET ${fields.join(', ')} WHERE id = 'singleton'`).bind(...values).run();
}
