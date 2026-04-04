export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

// POST — update read progress (0.0-1.0, never goes backward)
export async function POST(request, { params }) {
  const { slugid } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { progress } = await request.json();
  const p = Math.max(0, Math.min(1, parseFloat(progress) || 0));

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    await db.prepare(`
      INSERT INTO read_history (user_id, blog_id, read_at, read_progress)
      VALUES (?, ?, unixepoch(), ?)
      ON CONFLICT(user_id, blog_id)
      DO UPDATE SET
        read_progress = MAX(read_history.read_progress, excluded.read_progress),
        read_at = unixepoch()
    `).bind(session.userId, slugid, p).run();

    return NextResponse.json({ ok: true, progress: p });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
