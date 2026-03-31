export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

// GET — list user's interests
export async function GET() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();
    const result = await db.prepare(
      'SELECT tag FROM user_interests WHERE user_id = ? ORDER BY tag'
    ).bind(session.userId).all();

    return NextResponse.json({ interests: (result?.results || []).map(r => r.tag) });
  } catch {
    return NextResponse.json({ interests: [] });
  }
}

// PUT — replace all interests
export async function PUT(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { interests } = await request.json();
  if (!Array.isArray(interests)) {
    return NextResponse.json({ error: 'interests must be an array' }, { status: 400 });
  }

  // Max 20 interests
  const tags = [...new Set(interests.map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 20);

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    // Delete existing + insert new
    await db.prepare('DELETE FROM user_interests WHERE user_id = ?').bind(session.userId).run();

    if (tags.length > 0) {
      const placeholders = tags.map(() => '(?, ?)').join(', ');
      const binds = tags.flatMap(tag => [session.userId, tag]);
      await db.prepare(`INSERT INTO user_interests (user_id, tag) VALUES ${placeholders}`).bind(...binds).run();
    }

    return NextResponse.json({ ok: true, interests: tags });
  } catch (e) {
    console.error('Update interests error:', e);
    return NextResponse.json({ error: 'Failed to update interests' }, { status: 500 });
  }
}
