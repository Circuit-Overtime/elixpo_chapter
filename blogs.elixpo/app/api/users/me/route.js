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

    // Invalidate user cache
    try { const { kvInvalidate } = await import('../../../../lib/cache'); await kvInvalidate(`v1:user:${session.userId}`); } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Update user error:', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE — permanently delete account (mark as removed, wipe PII)
export async function DELETE() {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const now = Math.floor(Date.now() / 1000);

    // Fetch email before wiping for the goodbye email
    const user = await db.prepare('SELECT email, display_name FROM users WHERE id = ?').bind(session.userId).first();

    // Mark as removed and wipe personal data
    await db.prepare(`
      UPDATE users SET
        account_status = 'removed',
        display_name = 'Deleted User',
        bio = NULL,
        email = NULL,
        avatar_url = NULL,
        avatar_r2_key = NULL,
        banner_r2_key = NULL,
        location = '',
        timezone = '',
        pronouns = '',
        website = '',
        company = '',
        links = '[]',
        updated_at = ?
      WHERE id = ?
    `).bind(now, session.userId).run();

    // Unpublish all blogs
    await db.prepare(
      "UPDATE blogs SET status = 'archived' WHERE author_id = ?"
    ).bind(session.userId).run();

    // Send deletion confirmation email
    if (user?.email) {
      try {
        const { sendAccountDeleted } = await import('../../../../lib/email');
        sendAccountDeleted(user.email, { displayName: user.display_name }).catch(() => {});
      } catch {}
    }

    // Clear session
    const { clearSession } = await import('../../../../lib/auth');
    await clearSession();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Delete account error:', e);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
