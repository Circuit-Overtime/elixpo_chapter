export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

// Update current user's profile
export async function PUT(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const {
    display_name, bio, location, timezone, pronouns, website, company, links,
  } = await request.json();

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const now = Math.floor(Date.now() / 1000);
    await db.prepare(`
      UPDATE users SET
        display_name = COALESCE(?, display_name),
        bio = COALESCE(?, bio),
        location = COALESCE(?, location),
        timezone = COALESCE(?, timezone),
        pronouns = COALESCE(?, pronouns),
        website = COALESCE(?, website),
        company = COALESCE(?, company),
        links = COALESCE(?, links),
        updated_at = ?
      WHERE id = ?
    `).bind(
      display_name || null, bio || null, location || null, timezone || null,
      pronouns || null, website || null, company || null,
      links ? JSON.stringify(links) : null, now, session.userId,
    ).run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Update user error:', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
