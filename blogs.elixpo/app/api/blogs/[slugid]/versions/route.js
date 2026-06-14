export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

// GET — list version snapshots for a blog (editors only).
export async function GET(request, { params }) {
  const { slugid } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    const { canEditBlog } = await import('../../../../../lib/permissions');
    const perm = await canEditBlog(db, slugid, session.userId);
    if (!perm.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const res = await db.prepare(`
      SELECT v.id, v.label, v.created_at, v.created_by, u.username, u.display_name
      FROM blog_versions v LEFT JOIN users u ON u.id = v.created_by
      WHERE v.blog_id = ? ORDER BY v.created_at DESC LIMIT 30
    `).bind(slugid).all();

    return NextResponse.json({ versions: res?.results || [] });
  } catch (e) {
    return NextResponse.json({ versions: [] });
  }
}

// POST — restore a version: { versionId } → sets blog content to that snapshot.
export async function POST(request, { params }) {
  const { slugid } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { versionId } = await request.json();
  if (!versionId) return NextResponse.json({ error: 'Missing versionId' }, { status: 400 });

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    const { canEditBlog } = await import('../../../../../lib/permissions');
    const perm = await canEditBlog(db, slugid, session.userId);
    if (!perm.ok) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const version = await db.prepare('SELECT content FROM blog_versions WHERE id = ? AND blog_id = ?')
      .bind(versionId, slugid).first();
    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

    // Snapshot the current state first so a restore is itself undoable.
    try {
      const cur = await db.prepare('SELECT content FROM blogs WHERE id = ?').bind(slugid).first();
      if (cur?.content) {
        const { snapshotVersion } = await import('../../../../../lib/blogVersions');
        await snapshotVersion(db, slugid, cur.content, { label: 'pre-restore', userId: session.userId });
      }
    } catch {}

    const now = Math.floor(Date.now() / 1000);
    await db.prepare('UPDATE blogs SET content = ?, updated_at = ? WHERE id = ?')
      .bind(version.content, now, slugid).run();

    // Decompress for the client to load into the editor.
    let content = version.content;
    try { const { decompressBlogContent } = await import('../../../../../lib/compress'); content = decompressBlogContent(content); } catch {}

    return NextResponse.json({ ok: true, content, updatedAt: now });
  } catch (e) {
    console.error('Version restore error:', e);
    return NextResponse.json({ error: 'Failed to restore' }, { status: 500 });
  }
}
