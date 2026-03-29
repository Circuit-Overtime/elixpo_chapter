export const runtime = 'edge';
import { NextResponse } from 'next/server';

// Resolve @name to user or org, optionally fetch a blog by slug
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') || '').trim().toLowerCase();
  const slug = searchParams.get('slug') || '';
  const collection = searchParams.get('collection') || '';

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();

    // Check namespace to determine type
    const ns = await db.prepare('SELECT owner_type, owner_id FROM namespaces WHERE name = ?')
      .bind(name).first();

    if (!ns) {
      return NextResponse.json({ error: 'Not found', type: null }, { status: 404 });
    }

    // Resolve profile
    if (ns.owner_type === 'user') {
      const user = await db.prepare(`
        SELECT id, username, display_name, bio, avatar_url, banner_r2_key, created_at
        FROM users WHERE id = ?
      `).bind(ns.owner_id).first();

      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      // If slug requested, find the blog
      if (slug) {
        const blog = await db.prepare(`
          SELECT b.id, b.slug, b.title, b.subtitle, b.content, b.cover_image_r2_key,
            b.status, b.published_as, b.page_emoji, b.read_time_minutes,
            b.published_at, b.created_at, b.updated_at,
            u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
          FROM blogs b
          JOIN users u ON u.id = b.author_id
          WHERE b.slug = ? AND b.author_id = ? AND b.status IN ('published', 'unlisted')
        `).bind(slug, ns.owner_id).first();

        if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

        // Fetch tags
        const tags = await db.prepare('SELECT tag FROM blog_tags WHERE blog_id = ?')
          .bind(blog.id).all();

        return NextResponse.json({
          type: 'blog',
          owner: { type: 'user', ...user },
          blog: { ...blog, tags: (tags?.results || []).map(t => t.tag) },
        });
      }

      // Profile only — also fetch published blogs
      const blogs = await db.prepare(`
        SELECT id, slug, title, subtitle, cover_image_r2_key, page_emoji,
          read_time_minutes, published_at, status
        FROM blogs WHERE author_id = ? AND status IN ('published', 'unlisted')
        ORDER BY published_at DESC LIMIT 20
      `).bind(ns.owner_id).all();

      const followerCount = await db.prepare(
        "SELECT COUNT(*) as c FROM follows WHERE following_id = ? AND following_type = 'user'"
      ).bind(ns.owner_id).first();

      const followingCount = await db.prepare(
        'SELECT COUNT(*) as c FROM follows WHERE follower_id = ?'
      ).bind(ns.owner_id).first();

      return NextResponse.json({
        type: 'user',
        user: { ...user, followers: followerCount?.c || 0, following: followingCount?.c || 0 },
        blogs: blogs?.results || [],
      });
    }

    if (ns.owner_type === 'org') {
      const org = await db.prepare(`
        SELECT id, slug, name, description, bio, website, links, visibility,
          logo_url, logo_r2_key, banner_url, banner_r2_key, featured_blog_ids,
          owner_id, created_at
        FROM orgs WHERE id = ?
      `).bind(ns.owner_id).first();

      if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

      // If collection + slug, find blog in collection
      if (collection && slug) {
        const col = await db.prepare('SELECT id FROM collections WHERE org_id = ? AND slug = ?')
          .bind(ns.owner_id, collection).first();
        if (!col) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

        const blog = await db.prepare(`
          SELECT b.*, u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
          FROM blogs b JOIN users u ON u.id = b.author_id
          WHERE b.slug = ? AND b.collection_id = ? AND b.status IN ('published', 'unlisted')
        `).bind(slug, col.id).first();

        if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

        const tags = await db.prepare('SELECT tag FROM blog_tags WHERE blog_id = ?').bind(blog.id).all();
        return NextResponse.json({
          type: 'blog',
          owner: { type: 'org', ...org },
          collection: { id: col.id, slug: collection },
          blog: { ...blog, tags: (tags?.results || []).map(t => t.tag) },
        });
      }

      // If just slug (no collection), find blog under org
      if (slug) {
        const blog = await db.prepare(`
          SELECT b.*, u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
          FROM blogs b JOIN users u ON u.id = b.author_id
          WHERE b.slug = ? AND b.published_as = ? AND b.status IN ('published', 'unlisted')
        `).bind(slug, `org:${ns.owner_id}`).first();

        if (!blog) return NextResponse.json({ error: 'Blog not found' }, { status: 404 });

        const tags = await db.prepare('SELECT tag FROM blog_tags WHERE blog_id = ?').bind(blog.id).all();
        return NextResponse.json({
          type: 'blog',
          owner: { type: 'org', ...org },
          blog: { ...blog, tags: (tags?.results || []).map(t => t.tag) },
        });
      }

      // Org profile — fetch members, collections, blogs
      const [members, collections, blogs] = await Promise.all([
        db.prepare(`
          SELECT u.id, u.username, u.display_name, u.avatar_url, om.role
          FROM org_members om JOIN users u ON u.id = om.user_id
          WHERE om.org_id = ? ORDER BY om.joined_at LIMIT 50
        `).bind(ns.owner_id).all(),
        db.prepare('SELECT id, slug, name, description FROM collections WHERE org_id = ? ORDER BY created_at')
          .bind(ns.owner_id).all(),
        db.prepare(`
          SELECT id, slug, title, subtitle, cover_image_r2_key, page_emoji, read_time_minutes, published_at
          FROM blogs WHERE published_as = ? AND status IN ('published', 'unlisted')
          ORDER BY published_at DESC LIMIT 20
        `).bind(`org:${ns.owner_id}`).all(),
      ]);

      return NextResponse.json({
        type: 'org',
        org,
        members: members?.results || [],
        collections: collections?.results || [],
        blogs: blogs?.results || [],
      });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 500 });
  } catch (e) {
    console.error('Resolve error:', e);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
