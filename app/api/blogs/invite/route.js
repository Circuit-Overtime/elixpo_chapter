export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

/**
 * Blog collaborator management.
 *
 * Roles: viewer (read-only), editor (can edit), admin (can edit + manage collabs)
 * Status: pending (invited, not accepted), accepted
 *
 * Auth: blog author OR co-author with admin role can manage.
 */

async function canManage(db, blogId, userId) {
  const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(blogId).first();
  if (!blog) return { allowed: false, blog: null };
  if (blog.author_id === userId) return { allowed: true, blog };
  const coauthor = await db.prepare(
    "SELECT role FROM blog_co_authors WHERE blog_id = ? AND user_id = ? AND role = 'admin'"
  ).bind(blogId, userId).first();
  return { allowed: !!coauthor, blog };
}

// GET — list collaborators with status
export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slugid = searchParams.get('slugid');
  if (!slugid) return NextResponse.json({ error: 'Missing slugid' }, { status: 400 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    // Get blog author info
    const blog = await db.prepare(`
      SELECT b.author_id, u.username as author_username, u.display_name as author_name, u.avatar_url as author_avatar
      FROM blogs b JOIN users u ON u.id = b.author_id WHERE b.id = ?
    `).bind(slugid).first();

    const collabs = await db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, bc.role, bc.status, bc.added_at, bc.show_on_profile
      FROM blog_co_authors bc JOIN users u ON u.id = bc.user_id
      WHERE bc.blog_id = ? ORDER BY bc.added_at
    `).bind(slugid).all();

    // Check if current user can manage
    const { allowed } = await canManage(db, slugid, session.userId);

    return NextResponse.json({
      author: blog ? { id: blog.author_id, username: blog.author_username, display_name: blog.author_name, avatar_url: blog.author_avatar } : null,
      collaborators: collabs?.results || [],
      canManage: allowed,
    });
  } catch {
    return NextResponse.json({ collaborators: [], canManage: false });
  }
}

// POST — invite a collaborator
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { slugid, username, role } = await request.json();
  if (!slugid || !username || !['viewer', 'editor', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Missing slugid, username, or invalid role' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const { allowed, blog } = await canManage(db, slugid, session.userId);
    if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const invitee = await db.prepare('SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)').bind(username).first();
    if (!invitee) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (invitee.id === blog.author_id) return NextResponse.json({ error: 'Cannot invite the blog author' }, { status: 400 });

    // Cap collaborators at 10 (excluding the author). Re-inviting an existing
    // collaborator just updates their role, so only block genuinely new ones.
    const existing = await db.prepare('SELECT 1 FROM blog_co_authors WHERE blog_id = ? AND user_id = ?').bind(slugid, invitee.id).first();
    if (!existing) {
      const countRow = await db.prepare('SELECT COUNT(*) AS c FROM blog_co_authors WHERE blog_id = ?').bind(slugid).first();
      if ((countRow?.c || 0) >= 10) {
        return NextResponse.json({ error: 'A blog can have at most 10 collaborators.' }, { status: 400 });
      }
    }

    await db.prepare(`
      INSERT INTO blog_co_authors (blog_id, user_id, role, status, added_at)
      VALUES (?, ?, ?, 'pending', unixepoch())
      ON CONFLICT(blog_id, user_id) DO UPDATE SET role = excluded.role
    `).bind(slugid, invitee.id, role).run();

    // Notify the invitee. Link to the canonical reader URL (slug-based) with an
    // ?invite=<blogId> param so the reader page can show an accept/decline modal
    // over a blurred backdrop. target_id stays the blog id for the accept API.
    try {
      const inviter = await db.prepare('SELECT username, display_name, avatar_url FROM users WHERE id = ?').bind(session.userId).first();
      const blogInfo = await db.prepare('SELECT title FROM blogs WHERE id = ?').bind(slugid).first();
      const { notify } = await import('../../../../lib/notify');
      const { getBlogCanonicalPath } = await import('../../../../lib/blogUrl');
      const path = await getBlogCanonicalPath(db, slugid);
      const targetUrl = `${path}${path.includes('?') ? '&' : '?'}invite=${encodeURIComponent(slugid)}`;
      await notify(db, {
        userId: invitee.id, type: 'blog_invite',
        actorId: session.userId, actorName: inviter?.display_name || inviter?.username,
        actorAvatar: inviter?.avatar_url, targetId: slugid,
        targetTitle: blogInfo?.title, targetUrl,
      });
    } catch {}

    return NextResponse.json({ ok: true, userId: invitee.id, username: invitee.username, role, status: 'pending' });
  } catch (e) {
    console.error('Invite error:', e);
    return NextResponse.json({ error: 'Failed to invite' }, { status: 500 });
  }
}

// PUT — change role or accept invite
export async function PUT(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { slugid, userId, role, accept, showOnProfile } = await request.json();
  if (!slugid) return NextResponse.json({ error: 'Missing slugid' }, { status: 400 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    // Accept invite — the invitee accepts their own invite, choosing whether the
    // post cross-posts to their profile.
    if (accept) {
      const existing = await db.prepare(
        'SELECT status FROM blog_co_authors WHERE blog_id = ? AND user_id = ?'
      ).bind(slugid, session.userId).first();
      if (!existing) return NextResponse.json({ error: 'No invite found' }, { status: 404 });

      const sop = showOnProfile === false ? 0 : 1;
      await db.prepare(
        "UPDATE blog_co_authors SET status = 'accepted', show_on_profile = ? WHERE blog_id = ? AND user_id = ?"
      ).bind(sop, slugid, session.userId).run();

      return NextResponse.json({ ok: true, status: 'accepted', show_on_profile: sop });
    }

    // Self visibility toggle — a co-author changes whether THIS post shows on their profile.
    if (showOnProfile !== undefined && !role) {
      const mine = await db.prepare('SELECT 1 FROM blog_co_authors WHERE blog_id = ? AND user_id = ?')
        .bind(slugid, session.userId).first();
      if (!mine) return NextResponse.json({ error: 'Not a co-author' }, { status: 403 });
      await db.prepare('UPDATE blog_co_authors SET show_on_profile = ? WHERE blog_id = ? AND user_id = ?')
        .bind(showOnProfile ? 1 : 0, slugid, session.userId).run();
      return NextResponse.json({ ok: true, show_on_profile: showOnProfile ? 1 : 0 });
    }

    // Change role — requires manage permission
    if (!userId || !role || !['viewer', 'editor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Missing userId or invalid role' }, { status: 400 });
    }

    const { allowed } = await canManage(db, slugid, session.userId);
    if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await db.prepare('UPDATE blog_co_authors SET role = ? WHERE blog_id = ? AND user_id = ?')
      .bind(role, slugid, userId).run();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE — remove collaborator
export async function DELETE(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { slugid, userId } = await request.json();
  if (!slugid || !userId) return NextResponse.json({ error: 'Missing slugid or userId' }, { status: 400 });

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    // Allow self-removal (leaving) or admin removal
    if (userId === session.userId) {
      await db.prepare('DELETE FROM blog_co_authors WHERE blog_id = ? AND user_id = ?').bind(slugid, userId).run();
      return NextResponse.json({ ok: true });
    }

    const { allowed } = await canManage(db, slugid, session.userId);
    if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    await db.prepare('DELETE FROM blog_co_authors WHERE blog_id = ? AND user_id = ?').bind(slugid, userId).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
