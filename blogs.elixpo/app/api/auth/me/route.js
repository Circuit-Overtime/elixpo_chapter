export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session || !session.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { kvCache } = await import('../../../../lib/cache');
    const user = await kvCache(`v1:user:${session.userId}`, 300, async () => {
      const { getDB } = await import('../../../../lib/cloudflare');
      const db = getDB();
      return db.prepare(`
        SELECT id, email, username, display_name, bio, avatar_url, avatar_r2_key, banner_r2_key, locale,
               tier, storage_used_bytes, ai_usage_today, ai_usage_date,
               location, timezone, pronouns, website, company, links,
               created_at, updated_at
        FROM users WHERE id = ?
      `).bind(session.userId).first();
    });

    if (user) return NextResponse.json(user);
  } catch {
    // D1/KV not available — fall through
  }

  if (session.profile) return NextResponse.json(session.profile);

  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
