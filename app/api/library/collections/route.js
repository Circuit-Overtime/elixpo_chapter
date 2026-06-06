export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { validateSlug } from '../../../../lib/slugify';

// GET — list the user's reading lists (collections).
export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const collections = await db.prepare(`
      SELECT bc.id, bc.name, bc.description, bc.slug, bc.is_public, bc.created_at,
        (SELECT COUNT(*) FROM bookmarks WHERE user_id = ? AND collection_id = bc.id) as count
      FROM bookmark_collections bc WHERE bc.user_id = ?
      ORDER BY bc.name
    `).bind(session.userId, session.userId).all();
    const defaultCount = await db.prepare(
      'SELECT COUNT(*) as c FROM bookmarks WHERE user_id = ? AND collection_id IS NULL'
    ).bind(session.userId).first();
    return NextResponse.json({
      collections: [
        { id: 'default', name: 'Reading List', description: '', slug: 'reading-list', is_public: 0, count: defaultCount?.c || 0 },
        ...(collections?.results || []),
      ],
    });
  } catch {
    return NextResponse.json({ collections: [] });
  }
}

// POST — create a reading list { name, description?, isPublic? }
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { name, description, isPublic } = await request.json();
  const valid = validateSlug(name, { label: 'List name' });
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const count = await db.prepare('SELECT COUNT(*) as c FROM bookmark_collections WHERE user_id = ?').bind(session.userId).first();
    if ((count?.c || 0) >= 50) return NextResponse.json({ error: 'Max 50 lists' }, { status: 400 });

    // Unique slug within this user's lists.
    let base = valid.slug, slug = base, n = 1;
    while (await db.prepare('SELECT 1 FROM bookmark_collections WHERE user_id = ? AND slug = ?').bind(session.userId, slug).first()) {
      slug = `${base}-${++n}`;
    }
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO bookmark_collections (id, user_id, name, description, slug, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `).bind(id, session.userId, name.trim(), description || '', slug, isPublic ? 1 : 0).run();
    return NextResponse.json({ ok: true, id, name: name.trim(), slug, is_public: isPublic ? 1 : 0 });
  } catch (e) {
    if (e?.message?.includes('UNIQUE')) return NextResponse.json({ error: 'List name already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH — update a list { id, name?, isPublic? }
export async function PATCH(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id, name, isPublic } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const sets = [], binds = [];
    if (typeof name === 'string' && name.trim()) {
      const valid = validateSlug(name, { label: 'List name' });
      if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });
      sets.push('name = ?', 'slug = ?'); binds.push(name.trim(), valid.slug);
    }
    if (typeof isPublic !== 'undefined') { sets.push('is_public = ?'); binds.push(isPublic ? 1 : 0); }
    if (!sets.length) return NextResponse.json({ ok: true });
    sets.push('updated_at = unixepoch()');
    await db.prepare(`UPDATE bookmark_collections SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...binds, id, session.userId).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE — remove a list (?id=); its bookmarks fall back to the default list.
export async function DELETE(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    await db.prepare('DELETE FROM bookmark_collections WHERE id = ? AND user_id = ?').bind(id, session.userId).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
