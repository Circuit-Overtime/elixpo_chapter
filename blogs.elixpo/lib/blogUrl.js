// Build the canonical, scope-aware reader URL for a blog. Used so every
// notification / link points at the human URL, not the blog id.
//
//   personal blog:            /{author_username}/{slug}
//   org blog:                 /{org_slug}/{slug}
//   org blog in a collection: /{org_slug}/{collection_slug}/{slug}
//   fallback (missing data):  /{slugid or id}
//
// Pass a blog id; the helper resolves owner + collection scope in one query.
export async function getBlogCanonicalPath(db, blogId) {
  if (!blogId) return null;
  try {
    const blog = await db.prepare(`
      SELECT b.id, b.slugid, b.slug, b.published_as, b.collection_id,
             au.username AS author_username,
             col.slug AS collection_slug,
             org.slug AS org_slug
      FROM blogs b
      JOIN users au ON au.id = b.author_id
      LEFT JOIN collections col ON col.id = b.collection_id
      LEFT JOIN orgs org ON ('org:' || org.id) = b.published_as
      WHERE b.id = ?
    `).bind(blogId).first();

    if (!blog) return `/${blogId}`;
    const slug = blog.slug || blog.slugid || blog.id;

    if (blog.published_as && blog.published_as.startsWith('org:')) {
      if (blog.org_slug && blog.collection_slug) return `/${blog.org_slug}/${blog.collection_slug}/${slug}`;
      if (blog.org_slug) return `/${blog.org_slug}/${slug}`;
    }
    if (blog.author_username) return `/${blog.author_username}/${slug}`;
    return `/${blog.slugid || blog.id}`;
  } catch {
    return `/${blogId}`;
  }
}
