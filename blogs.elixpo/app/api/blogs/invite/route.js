export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

// Invite a collaborator to a blog
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { slugid, username, role } = await request.json();

  if (!slugid || !username || !['viewer', 'editor', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Missing slugid, username, or invalid role' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    // Verify requester is author
    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(slugid).first();
    if (!blog || blog.author_id !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Find user by username
    const invitee = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (!invitee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (invitee.id === session.userId) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Upsert co-author with role
    await db.prepare(`
      INSERT INTO blog_co_authors (blog_id, user_id, role, added_at)
      VALUES (?, ?, ?, unixepoch())
      ON CONFLICT(blog_id, user_id) DO UPDATE SET role = ?
    `).bind(slugid, invitee.id, role, role).run();

    return NextResponse.json({ ok: true, userId: invitee.id, username, role });
  } catch (e) {
    console.error('Invite error:', e);
    return NextResponse.json({ error: 'Failed to invite' }, { status: 500 });
  }
}

// List collaborators
export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slugid = searchParams.get('slugid');
  if (!slugid) {
    return NextResponse.json({ error: 'Missing slugid' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const collabs = await db.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, bc.role, bc.added_at
      FROM blog_co_authors bc
      JOIN users u ON u.id = bc.user_id
      WHERE bc.blog_id = ?
      ORDER BY bc.added_at
    `).bind(slugid).all();

    return NextResponse.json({ collaborators: collabs?.results || [] });
  } catch {
    return NextResponse.json({ collaborators: [] });
  }
}

// Remove collaborator
export async function DELETE(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { slugid, userId } = await request.json();
  if (!slugid || !userId) {
    return NextResponse.json({ error: 'Missing slugid or userId' }, { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const blog = await db.prepare('SELECT author_id FROM blogs WHERE id = ?').bind(slugid).first();
    if (!blog || blog.author_id !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await db.prepare('DELETE FROM blog_co_authors WHERE blog_id = ? AND user_id = ?')
      .bind(slugid, userId).run();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
