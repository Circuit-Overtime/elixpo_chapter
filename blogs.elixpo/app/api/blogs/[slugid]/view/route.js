export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';
import { hashIP } from '../../../../../lib/blog';

// POST — record a view (deduped per IP per 24h)
export async function POST(request, { params }) {
  const { slugid } = await params;
  const session = await getSession().catch(() => null);

  try {
    const { getDB } = await import('../../../../../lib/cloudflare');
    const db = getDB();

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const ipHash = await hashIP(ip);
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;

    // Deduplicate: one view per IP per blog per 24h
    const existing = await db.prepare(
      'SELECT 1 FROM blog_views WHERE blog_id = ? AND ip_hash = ? AND created_at > ?'
    ).bind(slugid, ipHash, dayAgo).first();

    if (!existing) {
      await db.prepare(
        'INSERT INTO blog_views (blog_id, user_id, ip_hash, created_at) VALUES (?, ?, ?, ?)'
      ).bind(slugid, session?.userId || null, ipHash, now).run();
    }

    const count = await db.prepare('SELECT COUNT(*) as c FROM blog_views WHERE blog_id = ?').bind(slugid).first();
    return NextResponse.json({ views: count?.c || 0 });
  } catch {
    return NextResponse.json({ views: 0 });
  }
}
