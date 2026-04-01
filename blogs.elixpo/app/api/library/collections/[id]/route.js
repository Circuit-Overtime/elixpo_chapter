export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

// PUT — rename collection
export async function PUT(request, { params }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { name, description } = await request.json();

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    await db.prepare(
      'UPDATE bookmark_collections SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = unixepoch() WHERE id = ? AND user_id = ?'
    ).bind(name || null, description || null, id, session.userId).run();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE — delete collection (bookmarks get collection_id = NULL)
export async function DELETE(request, { params }) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    await db.prepare('DELETE FROM bookmark_collections WHERE id = ? AND user_id = ?').bind(id, session.userId).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
