export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

// GET — list user's bookmark collections
export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const collections = await db.prepare(`
      SELECT bc.id, bc.name, bc.description, bc.created_at,
        (SELECT COUNT(*) FROM bookmarks WHERE user_id = ? AND collection_id = bc.id) as count
      FROM bookmark_collections bc WHERE bc.user_id = ?
      ORDER BY bc.name
    `).bind(session.userId, session.userId).all();

    // Count unsorted bookmarks (default collection)
    const defaultCount = await db.prepare(
      'SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ? AND collection_id IS NULL'
    ).bind(session.userId).first();

    return NextResponse.json({
      collections: [
        { id: 'default', name: 'Reading List', description: '', count: defaultCount?.c || 0 },
        ...(collections?.results || []),
      ],
    });
  } catch {
    return NextResponse.json({ collections: [] });
  }
}

// POST — create a named collection
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { name, description } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    // Max 50 collections
    const count = await db.prepare('SELECT COUNT(*) as c FROM bookmark_collections WHERE user_id = ?').bind(session.userId).first();
    if ((count?.c || 0) >= 50) return NextResponse.json({ error: 'Max 50 collections' }, { status: 400 });

    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO bookmark_collections (id, user_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
    `).bind(id, session.userId, name.trim(), description || '').run();

    return NextResponse.json({ ok: true, id, name: name.trim() });
  } catch (e) {
    if (e?.message?.includes('UNIQUE')) return NextResponse.json({ error: 'Collection name already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
