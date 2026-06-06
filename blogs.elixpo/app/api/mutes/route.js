export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';

const TYPES = new Set(['author', 'org', 'tag']);

// GET — list the current user's mutes.
export async function GET() {
  const session = await getSession().catch(() => null);
  if (!session?.userId) return NextResponse.json({ mutes: [] });
  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();
    const res = await db.prepare('SELECT target_type, target_id FROM mutes WHERE user_id = ?').bind(session.userId).all();
    return NextResponse.json({ mutes: res?.results || [] });
  } catch {
    return NextResponse.json({ mutes: [] });
  }
}

// POST — mute { targetType, targetId }
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { targetType, targetId } = await request.json();
  if (!TYPES.has(targetType) || !targetId) return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();
    await db.prepare(
      'INSERT OR IGNORE INTO mutes (user_id, target_type, target_id) VALUES (?, ?, ?)'
    ).bind(session.userId, targetType, String(targetId)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE — unmute { targetType, targetId }
export async function DELETE(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { targetType, targetId } = await request.json();
  if (!TYPES.has(targetType) || !targetId) return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const db = getDB();
    await db.prepare('DELETE FROM mutes WHERE user_id = ? AND target_type = ? AND target_id = ?')
      .bind(session.userId, targetType, String(targetId)).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
