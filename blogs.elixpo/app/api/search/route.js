export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';

// Lightweight combined search — returns minimal fields only
// For detailed data, use /api/search/users, /api/search/orgs, /api/search/blogs
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const scope = searchParams.get('scope') || 'all'; // all | users | orgs | blogs

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [], orgs: [], blogs: [] });
  }

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();
    const pattern = `%${q}%`;

    const results = { users: [], orgs: [], blogs: [] };

    if (scope === 'all' || scope === 'users') {
      const users = await db.prepare(`
        SELECT id, username, display_name, avatar_url
        FROM users WHERE LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?
        LIMIT 5
      `).bind(pattern, pattern).all();
      results.users = users?.results || [];
    }

    if (scope === 'all' || scope === 'orgs') {
      const orgs = await db.prepare(`
        SELECT id, slug, name, logo_url
        FROM orgs WHERE LOWER(slug) LIKE ? OR LOWER(name) LIKE ?
        LIMIT 5
      `).bind(pattern, pattern).all();
      results.orgs = orgs?.results || [];
    }

    if (scope === 'all' || scope === 'blogs') {
      const blogs = await db.prepare(`
        SELECT id as slugid, slug, title
        FROM blogs WHERE (LOWER(title) LIKE ? OR LOWER(slug) LIKE ?) AND status IN ('published', 'unlisted')
        LIMIT 5
      `).bind(pattern, pattern).all();
      results.blogs = blogs?.results || [];
    }

    return NextResponse.json(results);
  } catch {
    // D1 not available — fallback to session user
    try {
      const session = await getSession();
      const users = [];
      if (session?.profile) {
        const p = session.profile;
        if ((p.username || '').toLowerCase().includes(q) || (p.display_name || '').toLowerCase().includes(q)) {
          users.push({ id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
        }
      }
      return NextResponse.json({ users, orgs: [], blogs: [] });
    } catch {
      return NextResponse.json({ users: [], orgs: [], blogs: [] });
    }
  }
}
