/**
 * Namespace management — ensures usernames and org slugs are globally unique,
 * case-insensitive, and disjoint.
 *
 * Primary source of truth: `namespaces` table (name TEXT PRIMARY KEY).
 * Fallback: checks `users.username` and `orgs.slug` directly.
 */

// Reserved names that can't be used as usernames or org slugs
const RESERVED_NAMES = new Set([
  'admin', 'api', 'app', 'auth', 'blog', 'blogs', 'callback', 'cdn',
  'dashboard', 'docs', 'edit', 'explore', 'feed', 'handle', 'help',
  'home', 'intro', 'library', 'login', 'logout', 'mail', 'me', 'media',
  'new', 'new-blog', 'null', 'pricing', 'profile', 'register', 'resolve',
  'search', 'settings', 'sign-in', 'sign-up', 'signin', 'signup', 'stats',
  'status', 'stories', 'support', 'system', 'terms', 'test', 'undefined',
  'user', 'users', 'www',
]);

/**
 * Validate a name format (username or org slug).
 * Returns { valid: boolean, error?: string }
 */
export function validateNameFormat(name) {
  if (!name || typeof name !== 'string') return { valid: false, error: 'Name is required' };
  const clean = name.toLowerCase().trim();
  if (clean.length < 2) return { valid: false, error: 'Must be at least 2 characters' };
  if (clean.length > 40) return { valid: false, error: 'Must be 40 characters or less' };
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(clean) && clean.length > 1) {
    if (/^[a-z0-9]{2}$/.test(clean)) { /* 2-char names OK */ }
    else return { valid: false, error: 'Only lowercase letters, numbers, and hyphens. Must start and end with a letter or number' };
  }
  if (/--/.test(clean)) return { valid: false, error: 'Cannot contain consecutive hyphens' };
  if (RESERVED_NAMES.has(clean)) return { valid: false, error: 'This name is reserved' };
  return { valid: true };
}

/**
 * Check if a name is available in the shared namespace.
 * Checks namespaces table first, falls back to users + orgs tables.
 * Returns { available: boolean, takenBy?: 'user' | 'org' | 'reserved' }
 */
export async function checkNameAvailable(db, name) {
  const clean = name.toLowerCase().trim();

  // Check reserved names first (no DB hit)
  const fmt = validateNameFormat(clean);
  if (!fmt.valid) return { available: false, takenBy: 'reserved', error: fmt.error };

  // Check namespaces table (primary)
  const ns = await db.prepare('SELECT owner_type FROM namespaces WHERE name = ?')
    .bind(clean).first();
  if (ns) return { available: false, takenBy: ns.owner_type };

  // Fallback: check users and orgs tables directly (in case namespace wasn't seeded)
  const user = await db.prepare('SELECT id FROM users WHERE LOWER(username) = ?')
    .bind(clean).first();
  if (user) return { available: false, takenBy: 'user' };

  const org = await db.prepare('SELECT id FROM orgs WHERE LOWER(slug) = ?')
    .bind(clean).first();
  if (org) return { available: false, takenBy: 'org' };

  return { available: true };
}

/**
 * Reserve a name in the shared namespace.
 * Uses INSERT OR IGNORE to handle race conditions — if two requests
 * try to reserve the same name simultaneously, one will silently fail.
 * Returns { success: boolean }
 */
export async function reserveName(db, name, ownerType, ownerId) {
  const clean = name.toLowerCase().trim();
  const result = await db.prepare(
    'INSERT OR IGNORE INTO namespaces (name, owner_type, owner_id, created_at) VALUES (?, ?, ?, unixepoch())'
  ).bind(clean, ownerType, ownerId).run();

  // Check if the insert actually happened (changes > 0)
  // If not, someone else reserved it first
  if (result?.meta?.changes === 0) {
    return { success: false };
  }
  return { success: true };
}

/**
 * Atomically check and reserve a name. Returns { success, error? }
 */
export async function tryReserveName(db, name, ownerType, ownerId) {
  const clean = name.toLowerCase().trim();

  const fmt = validateNameFormat(clean);
  if (!fmt.valid) return { success: false, error: fmt.error };

  // Try to insert — PRIMARY KEY constraint prevents duplicates
  try {
    const result = await db.prepare(
      'INSERT INTO namespaces (name, owner_type, owner_id, created_at) VALUES (?, ?, ?, unixepoch())'
    ).bind(clean, ownerType, ownerId).run();
    return { success: true };
  } catch (e) {
    // UNIQUE/PRIMARY KEY violation = name taken
    if (e.message?.includes('UNIQUE') || e.message?.includes('PRIMARY')) {
      const existing = await db.prepare('SELECT owner_type FROM namespaces WHERE name = ?').bind(clean).first();
      return { success: false, error: existing?.owner_type === 'user' ? 'Taken by a user' : 'Already taken' };
    }
    throw e;
  }
}

/**
 * Release a name from the namespace.
 */
export async function releaseName(db, name) {
  await db.prepare('DELETE FROM namespaces WHERE name = ?')
    .bind(name.toLowerCase().trim()).run();
}

/**
 * Check if a blog slug is available globally (case-insensitive).
 */
export async function checkBlogSlugAvailable(db, slug, excludeBlogId) {
  const clean = slug.toLowerCase().trim();
  const query = excludeBlogId
    ? 'SELECT id FROM blogs WHERE LOWER(slug) = ? AND id != ?'
    : 'SELECT id FROM blogs WHERE LOWER(slug) = ?';
  const params = excludeBlogId ? [clean, excludeBlogId] : [clean];
  const row = await db.prepare(query).bind(...params).first();
  return { available: !row };
}

/**
 * Generate a unique blog slug. Appends a short suffix if taken.
 */
export async function ensureUniqueBlogSlug(db, baseSlug, excludeBlogId) {
  const clean = baseSlug.toLowerCase().trim();
  if (!clean) return `post-${Date.now().toString(36)}`;

  const { available } = await checkBlogSlugAvailable(db, clean, excludeBlogId);
  if (available) return clean;

  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${clean}-${suffix}`;
    const check = await checkBlogSlugAvailable(db, candidate, excludeBlogId);
    if (check.available) return candidate;
  }

  return `${clean}-${Date.now().toString(36)}`;
}
