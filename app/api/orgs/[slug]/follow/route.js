export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';

async function getOrg(db, slug) {
  return db.prepare('SELECT id, slug, name FROM orgs WHERE LOWER(slug) = LOWER(?)').bind(slug).first();
}

// GET — does the current user follow this org? { following }
export async function GET(request, { params }) {
  const { slug } = await params;
  const session = await getSession().catch(() => null);
  if (!session?.userId) return NextResponse.json({ following: false });
  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();
    const org = await getOrg(db, slug);
    if (!org) return NextResponse.json({ following: false });
    const row = await db.prepare(
      "SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND following_type = 'org'"
    ).bind(session.userId, org.id).first();
    return NextResponse.json({ following: !!row });
  } catch {
    return NextResponse.json({ following: false });
  }
}

// POST — follow this org
export async function POST(request, { params }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();
    const org = await getOrg(db, slug);
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    await db.prepare(
      "INSERT OR IGNORE INTO follows (follower_id, following_id, following_type) VALUES (?, ?, 'org')"
    ).bind(session.userId, org.id).run();
    return NextResponse.json({ following: true });
  } catch {
    return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
  }
}

// DELETE — unfollow this org
export async function DELETE(request, { params }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();
    const org = await getOrg(db, slug);
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    await db.prepare(
      "DELETE FROM follows WHERE follower_id = ? AND following_id = ? AND following_type = 'org'"
    ).bind(session.userId, org.id).run();
    return NextResponse.json({ following: false });
  } catch {
    return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
  }
}
