export const runtime = 'edge';
// Must run per-request: the URL list comes from D1, which is only bound at runtime.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const SITE_URL = 'https://blogs.elixpo.com';

// Dynamic sitemap.
//
// This replaces a hand-written public/sitemap.xml that listed 5 static pages and no
// content at all, so no blog, profile or organization was ever discoverable through
// it. Search engines had to find posts by crawling links alone.
//
// Excluded on purpose:
//   secret posts    — anonymous, and served noindex; listing them would invite the
//                     exact crawling we suppress everywhere else
//   unlisted posts  — deliberately kept out of public discovery by their author
//   drafts          — not public
const ts = (sec) => (sec ? new Date(sec * 1000) : new Date());

export default async function sitemap() {
  const staticPages = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/docs`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/help`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/badges`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ].map((p) => ({ ...p, lastModified: new Date() }));

  try {
    const { getDB } = await import('../lib/cloudflare');
    const db = getDB();

    const [blogs, users, orgs, collections] = await Promise.all([
      db.prepare(`
        SELECT b.slug, b.updated_at, b.published_at, b.published_as,
               au.username AS author_username, o.slug AS org_slug, col.slug AS collection_slug
        FROM blogs b
        JOIN users au ON au.id = b.author_id
        LEFT JOIN orgs o ON ('org:' || o.id) = b.published_as
        LEFT JOIN collections col ON col.id = b.collection_id
        WHERE b.status = 'published' AND b.secret = 0
        ORDER BY b.published_at DESC
        LIMIT 40000
      `).all(),
      // Keep the complete sitemap under the protocol's 50,000 URL ceiling while
      // making room for substantially more individually indexed posts.
      db.prepare("SELECT username, updated_at FROM users WHERE username IS NOT NULL LIMIT 5000").all(),
      db.prepare('SELECT slug, updated_at FROM orgs WHERE visibility != ? LIMIT 2000').bind('private').all(),
      db.prepare('SELECT c.slug AS cslug, o.slug AS oslug, c.updated_at FROM collections c JOIN orgs o ON o.id = c.org_id WHERE o.visibility != ? LIMIT 2000').bind('private').all(),
    ]);

    const blogUrls = (blogs?.results || []).map((b) => {
      const owner = b.published_as?.startsWith('org:') ? b.org_slug : b.author_username;
      if (!owner || !b.slug) return null;
      const path = b.collection_slug && b.org_slug
        ? `${b.org_slug}/${b.collection_slug}/${b.slug}`
        : `${owner}/${b.slug}`;
      return {
        url: `${SITE_URL}/${path}`,
        lastModified: ts(b.updated_at || b.published_at),
        changeFrequency: 'weekly',
        priority: 0.9,
      };
    }).filter(Boolean);

    const userUrls = (users?.results || []).map((u) => ({
      url: `${SITE_URL}/${u.username}`,
      lastModified: ts(u.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const orgUrls = (orgs?.results || []).map((o) => ({
      url: `${SITE_URL}/${o.slug}`,
      lastModified: ts(o.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const collectionUrls = (collections?.results || []).map((c) => ({
      url: `${SITE_URL}/${c.oslug}/${c.cslug}`,
      lastModified: ts(c.updated_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticPages, ...blogUrls, ...userUrls, ...orgUrls, ...collectionUrls];
  } catch {
    // D1 unavailable (local dev, or a bad deploy): still serve the static pages
    // rather than a 500, which search engines treat as a broken sitemap.
    return staticPages;
  }
}
