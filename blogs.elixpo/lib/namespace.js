/**
 * Check if a name (username or org slug) is available in the shared namespace.
 * Returns { available: boolean, takenBy?: 'user' | 'org' }
 */
export async function checkNameAvailable(db, name) {
  const row = await db.prepare('SELECT owner_type FROM namespaces WHERE name = ?')
    .bind(name.toLowerCase()).first();
  if (row) return { available: false, takenBy: row.owner_type };
  return { available: true };
}

/**
 * Reserve a name in the shared namespace.
 * Throws on conflict (UNIQUE constraint).
 */
export async function reserveName(db, name, ownerType, ownerId) {
  await db.prepare(
    'INSERT INTO namespaces (name, owner_type, owner_id, created_at) VALUES (?, ?, ?, unixepoch())'
  ).bind(name.toLowerCase(), ownerType, ownerId).run();
}

/**
 * Release a name from the namespace (e.g. when deleting an org).
 */
export async function releaseName(db, name) {
  await db.prepare('DELETE FROM namespaces WHERE name = ?')
    .bind(name.toLowerCase()).run();
}

/**
 * Check if a blog slug is available globally.
 * Returns { available: boolean }
 */
export async function checkBlogSlugAvailable(db, slug, excludeBlogId) {
  const query = excludeBlogId
    ? 'SELECT id FROM blogs WHERE slug = ? AND id != ?'
    : 'SELECT id FROM blogs WHERE slug = ?';
  const params = excludeBlogId ? [slug, excludeBlogId] : [slug];
  const row = await db.prepare(query).bind(...params).first();
  return { available: !row };
}

/**
 * Generate a unique blog slug. Appends a short suffix if the base slug is taken.
 */
export async function ensureUniqueBlogSlug(db, baseSlug, excludeBlogId) {
  const { available } = await checkBlogSlugAvailable(db, baseSlug, excludeBlogId);
  if (available) return baseSlug;

  // Append random suffix
  for (let i = 0; i < 10; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${baseSlug}-${suffix}`;
    const check = await checkBlogSlugAvailable(db, candidate, excludeBlogId);
    if (check.available) return candidate;
  }

  // Fallback: timestamp
  return `${baseSlug}-${Date.now().toString(36)}`;
}
