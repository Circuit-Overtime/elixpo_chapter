/**
 * Database utilities for D1
 * Import this in API routes to interact with the D1 database
 */

import type { D1Database } from '@cloudflare/workers-types';

export async function createUser(
  db: D1Database,
  { id, email, passwordHash }: { id: string; email: string; passwordHash?: string }
) {
  const stmt = db.prepare(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP'
  );
  return await stmt.bind(id, email, passwordHash || null).run();
}

export async function getUserById(db: D1Database, userId: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return await stmt.bind(userId).first();
}

export async function getUserByEmail(db: D1Database, email: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
  return await stmt.bind(email).first();
}

export async function getUserByEmailWithPassword(db: D1Database, email: string) {
  const stmt = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ? AND is_active = 1');
  return await stmt.bind(email).first();
}

export async function createIdentity(
  db: D1Database,
  {
    id,
    userId,
    provider,
    providerUserId,
    providerEmail,
    providerProfileUrl,
  }: {
    id: string;
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail?: string;
    providerProfileUrl?: string;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO identities (id, user_id, provider, provider_user_id, provider_email, provider_profile_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, provider_user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`
  );
  return await stmt.bind(
    id,
    userId,
    provider,
    providerUserId,
    providerEmail || null,
    providerProfileUrl || null
  ).run();
}

export async function getIdentityByProvider(
  db: D1Database,
  provider: string,
  providerUserId: string
) {
  const stmt = db.prepare(
    'SELECT * FROM identities WHERE provider = ? AND provider_user_id = ?'
  );
  return await stmt.bind(provider, providerUserId).first();
}

export async function getIdentitiesByUserId(db: D1Database, userId: string) {
  const stmt = db.prepare(
    'SELECT * FROM identities WHERE user_id = ? ORDER BY created_at ASC'
  );
  return await stmt.bind(userId).all();
}

export async function createAuthRequest(
  db: D1Database,
  {
    id,
    state,
    nonce,
    pkceVerifier,
    provider,
    clientId,
    redirectUri,
    scopes,
    expiresAt,
  }: {
    id: string;
    state: string;
    nonce: string;
    pkceVerifier: string;
    provider: string;
    clientId: string;
    redirectUri: string;
    scopes?: string;
    expiresAt: Date;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO auth_requests (id, state, nonce, pkce_verifier, provider, client_id, redirect_uri, scopes, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  return await stmt.bind(
    id,
    state,
    nonce,
    pkceVerifier,
    provider,
    clientId,
    redirectUri,
    scopes || null,
    expiresAt.toISOString()
  ).run();
}

export async function getAuthRequestByState(db: D1Database, state: string) {
  const stmt = db.prepare(
    'SELECT * FROM auth_requests WHERE state = ? AND expires_at > CURRENT_TIMESTAMP'
  );
  return await stmt.bind(state).first();
}

export async function deleteAuthRequest(db: D1Database, state: string) {
  const stmt = db.prepare('DELETE FROM auth_requests WHERE state = ?');
  return await stmt.bind(state).run();
}

export async function createRefreshToken(
  db: D1Database,
  {
    id,
    userId,
    tokenHash,
    clientId,
    expiresAt,
  }: {
    id: string;
    userId: string;
    tokenHash: string;
    clientId?: string;
    expiresAt: Date;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, client_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  return await stmt.bind(id, userId, tokenHash, clientId || null, expiresAt.toISOString()).run();
}

export async function getRefreshTokenByHash(db: D1Database, tokenHash: string) {
  const stmt = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP AND revoked = 0'
  );
  return await stmt.bind(tokenHash).first();
}

export async function revokeRefreshToken(db: D1Database, tokenHash: string) {
  const stmt = db.prepare(
    'UPDATE refresh_tokens SET revoked = 1, revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?'
  );
  return await stmt.bind(tokenHash).run();
}

export async function updateUserLastLogin(db: D1Database, userId: string) {
  const stmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
  return await stmt.bind(userId).run();
}

export async function logAuditEvent(
  db: D1Database,
  {
    id,
    userId,
    eventType,
    provider,
    ipAddress,
    userAgent,
    status,
    errorMessage,
  }: {
    id: string;
    userId?: string;
    eventType: string;
    provider?: string;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    errorMessage?: string;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO audit_logs (id, user_id, event_type, provider, ip_address, user_agent, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  return await stmt.bind(
    id,
    userId || null,
    eventType,
    provider || null,
    ipAddress || null,
    userAgent || null,
    status,
    errorMessage || null
  ).run();
}

/**
 * OAuth Client Management
 * For registering and managing OAuth applications
 */

export async function createOAuthClient(
  db: D1Database,
  {
    clientId,
    clientSecretHash,
    name,
    redirectUris,
    scopes,
    ownerId,
    description,
    homepageUrl,
  }: {
    clientId: string;
    clientSecretHash: string;
    name: string;
    redirectUris: string; // JSON stringified array
    scopes: string; // JSON stringified array
    ownerId: string;
    description?: string;
    homepageUrl?: string;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO oauth_clients (client_id, client_secret_hash, name, redirect_uris, scopes, owner_id, description, homepage_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  return await stmt.bind(clientId, clientSecretHash, name, redirectUris, scopes, ownerId, description ?? null, homepageUrl ?? null).run();
}

export async function getOAuthClientById(db: D1Database, clientId: string) {
  const stmt = db.prepare(
    'SELECT client_id, name, redirect_uris, scopes, created_at, is_active FROM oauth_clients WHERE client_id = ?'
  );
  return await stmt.bind(clientId).first();
}

export async function getOAuthClientByIdWithSecret(db: D1Database, clientId: string) {
  const stmt = db.prepare(
    'SELECT * FROM oauth_clients WHERE client_id = ?'
  );
  return await stmt.bind(clientId).first();
}

export async function validateOAuthClient(
  db: D1Database,
  clientId: string,
  clientSecretHash: string
): Promise<boolean> {
  const stmt = db.prepare(
    'SELECT 1 FROM oauth_clients WHERE client_id = ? AND client_secret_hash = ? AND is_active = 1'
  );
  const result = await stmt.bind(clientId, clientSecretHash).first();
  return !!result;
}

export async function updateOAuthClient(
  db: D1Database,
  clientId: string,
  updates: {
    name?: string;
    redirectUris?: string;
    scopes?: string;
    isActive?: boolean;
    description?: string;
    homepageUrl?: string;
    logoUrl?: string;
    clientSecretHash?: string;
  }
) {
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.clientSecretHash !== undefined) {
    setClauses.push('client_secret_hash = ?');
    values.push(updates.clientSecretHash);
  }
  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.redirectUris !== undefined) {
    setClauses.push('redirect_uris = ?');
    values.push(updates.redirectUris);
  }
  if (updates.scopes !== undefined) {
    setClauses.push('scopes = ?');
    values.push(updates.scopes);
  }
  if (updates.isActive !== undefined) {
    setClauses.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.description !== undefined) {
    setClauses.push('description = ?');
    values.push(updates.description);
  }
  if (updates.homepageUrl !== undefined) {
    setClauses.push('homepage_url = ?');
    values.push(updates.homepageUrl);
  }
  if (updates.logoUrl !== undefined) {
    setClauses.push('logo_url = ?');
    values.push(updates.logoUrl);
  }

  if (setClauses.length === 0) {
    return null;
  }

  values.push(clientId);

  const stmt = db.prepare(
    `UPDATE oauth_clients SET ${setClauses.join(', ')} WHERE client_id = ?`
  );
  return await stmt.bind(...(values as (string | number)[])).run();
}

export async function listOAuthClients(db: D1Database, limit: number = 50, offset: number = 0) {
  const stmt = db.prepare(
    'SELECT client_id, name, created_at, is_active FROM oauth_clients ORDER BY created_at DESC LIMIT ? OFFSET ?'
  );
  return await stmt.bind(limit, offset).all();
}

/**
 * Privilege/Role Management
 * For fine-grained access control
 */

export async function createPrivilege(
  db: D1Database,
  {
    id,
    code,
    name,
    description,
    isSystem,
  }: {
    id: string;
    code: string;
    name: string;
    description?: string;
    isSystem?: boolean;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO privileges (id, code, name, description, is_system)
     VALUES (?, ?, ?, ?, ?)`
  );
  return await stmt.bind(id, code, name, description || null, isSystem ? 1 : 0).run();
}

export async function getPrivilegeByCode(db: D1Database, code: string) {
  const stmt = db.prepare('SELECT * FROM privileges WHERE code = ?');
  return await stmt.bind(code).first();
}

export async function grantPrivilegeToUser(
  db: D1Database,
  {
    id,
    userId,
    privilegeId,
    grantedBy,
    expiryDate,
    reason,
  }: {
    id: string;
    userId: string;
    privilegeId: string;
    grantedBy?: string;
    expiryDate?: Date;
    reason?: string;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO user_privileges (id, user_id, privilege_id, granted_by, expiry_date, reason)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  return await stmt.bind(
    id,
    userId,
    privilegeId,
    grantedBy || null,
    expiryDate ? expiryDate.toISOString() : null,
    reason || null
  ).run();
}

export async function revokePrivilegeFromUser(db: D1Database, userId: string, privilegeId: string) {
  const stmt = db.prepare(
    'DELETE FROM user_privileges WHERE user_id = ? AND privilege_id = ?'
  );
  return await stmt.bind(userId, privilegeId).run();
}

export async function getUserPrivileges(db: D1Database, userId: string) {
  const stmt = db.prepare(
    `SELECT p.id, p.code, p.name, p.description, up.granted_at, up.expiry_date
     FROM user_privileges up
     JOIN privileges p ON up.privilege_id = p.id
     WHERE up.user_id = ? AND (up.expiry_date IS NULL OR up.expiry_date > CURRENT_TIMESTAMP)`
  );
  return await stmt.bind(userId).all();
}

export async function hasPrivilege(db: D1Database, userId: string, privilegeCode: string): Promise<boolean> {
  const stmt = db.prepare(
    `SELECT 1 FROM user_privileges up
     JOIN privileges p ON up.privilege_id = p.id
     WHERE up.user_id = ? AND p.code = ? AND (up.expiry_date IS NULL OR up.expiry_date > CURRENT_TIMESTAMP)`
  );
  const result = await stmt.bind(userId, privilegeCode).first();
  return !!result;
}

export async function listPrivileges(db: D1Database) {
  const stmt = db.prepare('SELECT * FROM privileges ORDER BY name');
  return await stmt.all();
}

/**
 * Admin Dashboard Queries
 */

export async function getAdminDashboardStats(db: D1Database, daysBack: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startIso = startDate.toISOString().split('T')[0];

  const [totalUsersResult, activeUsersResult, totalAppsResult, totalRequestsResult, errorRateResult] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first(),
    db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE last_login > ? AND is_active = 1'
    ).bind(startDate.toISOString()).first(),
    db.prepare('SELECT COUNT(*) as count FROM oauth_clients WHERE is_active = 1').first(),
    db.prepare(
      'SELECT COALESCE(SUM(requests), 0) as total FROM app_stats WHERE date >= ?'
    ).bind(startIso).first(),
    db.prepare(
      'SELECT COALESCE(SUM(errors), 0) as errors, COALESCE(SUM(requests), 1) as requests, COALESCE(AVG(avg_response_time), 0) as avg_rt FROM app_stats WHERE date >= ?'
    ).bind(startIso).first(),
  ]);

  const totalRequests = (totalRequestsResult as any)?.total || 0;
  const errors = (errorRateResult as any)?.errors || 0;
  const requests = (errorRateResult as any)?.requests || 1;
  const avgResponseTime = Math.round((errorRateResult as any)?.avg_rt || 0);

  return {
    totalUsers: (totalUsersResult as any)?.count || 0,
    activeUsers: (activeUsersResult as any)?.count || 0,
    totalApps: (totalAppsResult as any)?.count || 0,
    totalRequests,
    avgResponseTime,
    errorRate: totalRequests > 0 ? errors / requests : 0,
  };
}

export async function getRequestTrend(db: D1Database, days: number = 7) {
  const results = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const row = await db.prepare(
      'SELECT COALESCE(SUM(requests), 0) as requests, COALESCE(SUM(errors), 0) as errors FROM app_stats WHERE date = ?'
    ).bind(dateStr).first() as any;
    results.push({
      date: dateStr,
      requests: row?.requests || 0,
      errors: row?.errors || 0,
    });
  }
  return results;
}

export async function getTopApps(db: D1Database, limit: number = 5) {
  const stmt = db.prepare(
    `SELECT oc.client_id as id, oc.name,
       COALESCE(SUM(s.requests), 0) as requests,
       COALESCE(SUM(s.users), 0) as users,
       CASE WHEN COALESCE(SUM(s.requests), 0) = 0 THEN 0
            ELSE CAST(COALESCE(SUM(s.errors), 0) AS REAL) / COALESCE(SUM(s.requests), 1)
       END as errorRate
     FROM oauth_clients oc
     LEFT JOIN app_stats s ON oc.client_id = s.client_id
     WHERE oc.is_active = 1
     GROUP BY oc.client_id, oc.name
     ORDER BY requests DESC
     LIMIT ?`
  );
  const result = await stmt.bind(limit).all();
  return (result.results || []) as any[];
}

export async function listAdminUsers(
  db: D1Database,
  limit: number = 20,
  offset: number = 0,
  search: string = ''
) {
  if (search) {
    const stmt = db.prepare(
      `SELECT id, email, is_admin, is_active, created_at, last_login, email_verified, role
       FROM users
       WHERE email LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    );
    return await stmt.bind(`%${search}%`, limit, offset).all();
  }
  const stmt = db.prepare(
    `SELECT id, email, is_admin, is_active, created_at, last_login, email_verified, role
     FROM users
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  );
  return await stmt.bind(limit, offset).all();
}

export async function countUsers(db: D1Database, search: string = '') {
  if (search) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email LIKE ?');
    const result = await stmt.bind(`%${search}%`).first();
    return (result as any)?.count || 0;
  }
  const result = await db.prepare('SELECT COUNT(*) as count FROM users').first();
  return (result as any)?.count || 0;
}

export async function setUserAdminStatus(db: D1Database, userId: string, isAdmin: boolean) {
  const stmt = db.prepare(
    'UPDATE users SET is_admin = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  return await stmt.bind(isAdmin ? 1 : 0, isAdmin ? 'admin' : 'user', userId).run();
}

export async function setUserActiveStatus(db: D1Database, userId: string, isActive: boolean) {
  const stmt = db.prepare(
    'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );
  return await stmt.bind(isActive ? 1 : 0, userId).run();
}

export async function getAdminLogs(db: D1Database, limit: number = 50, offset: number = 0) {
  const stmt = db.prepare(
    `SELECT al.*, u.email as admin_email
     FROM admin_logs al
     LEFT JOIN users u ON al.admin_id = u.id
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`
  );
  return await stmt.bind(limit, offset).all();
}

export async function logAdminAction(
  db: D1Database,
  {
    id,
    adminId,
    action,
    resourceType,
    resourceId,
    changes,
    ipAddress,
    userAgent,
    status,
    errorMessage,
  }: {
    id: string;
    adminId: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    changes?: object;
    ipAddress?: string;
    userAgent?: string;
    status?: string;
    errorMessage?: string;
  }
) {
  const stmt = db.prepare(
    `INSERT INTO admin_logs (id, admin_id, action, resource_type, resource_id, changes, ip_address, user_agent, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  return await stmt.bind(
    id,
    adminId,
    action,
    resourceType || null,
    resourceId || null,
    changes ? JSON.stringify(changes) : null,
    ipAddress || null,
    userAgent || null,
    status || 'success',
    errorMessage || null
  ).run();
}

export async function listUserOAuthClients(db: D1Database, userId: string) {
  return db
    .prepare(
      `SELECT client_id, name, description, logo_url, redirect_uris, scopes,
              is_active, created_at, last_used, request_count
       FROM oauth_clients
       WHERE owner_id = ? AND is_active = 1
       ORDER BY created_at DESC`
    )
    .bind(userId)
    .all();
}

export async function getUserNotificationPreferences(db: D1Database, userId: string) {
  return db
    .prepare(`SELECT * FROM user_notification_preferences WHERE user_id = ?`)
    .bind(userId)
    .first();
}

export async function upsertUserNotificationPreferences(
  db: D1Database,
  userId: string,
  prefs: {
    email_login_alerts?: boolean;
    email_app_activity?: boolean;
    email_weekly_digest?: boolean;
    email_security_alerts?: boolean;
  }
) {
  const { generateRandomString } = await import('./webcrypto');
  const token = generateRandomString(32);
  return db
    .prepare(
      `INSERT INTO user_notification_preferences
         (user_id, email_login_alerts, email_app_activity, email_weekly_digest, email_security_alerts, unsubscribe_token, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         email_login_alerts = COALESCE(excluded.email_login_alerts, email_login_alerts),
         email_app_activity = COALESCE(excluded.email_app_activity, email_app_activity),
         email_weekly_digest = COALESCE(excluded.email_weekly_digest, email_weekly_digest),
         email_security_alerts = COALESCE(excluded.email_security_alerts, email_security_alerts),
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      userId,
      prefs.email_login_alerts !== undefined ? (prefs.email_login_alerts ? 1 : 0) : 1,
      prefs.email_app_activity !== undefined ? (prefs.email_app_activity ? 1 : 0) : 0,
      prefs.email_weekly_digest !== undefined ? (prefs.email_weekly_digest ? 1 : 0) : 0,
      prefs.email_security_alerts !== undefined ? (prefs.email_security_alerts ? 1 : 0) : 1,
      token
    )
    .run();
}
