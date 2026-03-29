export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [], orgs: [], blogs: [] });
  }

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();
    const pattern = `%${q}%`;

    const [users, orgs, blogs] = await Promise.all([
      db.prepare(`
        SELECT id, username, display_name, avatar_url
        FROM users WHERE username LIKE ? OR display_name LIKE ?
        LIMIT 5
      `).bind(pattern, pattern).all(),

      db.prepare(`
        SELECT id, slug, name, logo_url, description
        FROM orgs WHERE slug LIKE ? OR name LIKE ?
        LIMIT 5
      `).bind(pattern, pattern).all(),

      db.prepare(`
        SELECT id as slugid, slug, title
        FROM blogs WHERE (title LIKE ? OR slug LIKE ?) AND status IN ('published', 'unlisted')
        LIMIT 5
      `).bind(pattern, pattern).all(),
    ]);

    return NextResponse.json({
      users: users?.results || [],
      orgs: orgs?.results || [],
      blogs: blogs?.results || [],
    });
  } catch {
    // D1 not available — fallback: return current user from session if matching
    try {
      const session = await getSession();
      const users = [];
      if (session?.profile) {
        const p = session.profile;
        const ql = q.toLowerCase();
        if ((p.username || '').toLowerCase().includes(ql) || (p.display_name || '').toLowerCase().includes(ql)) {
          users.push({ id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
        }
      }
      return NextResponse.json({ users, orgs: [], blogs: [] });
    } catch {
      return NextResponse.json({ users: [], orgs: [], blogs: [] });
    }
  }
}
