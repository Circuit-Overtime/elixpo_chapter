import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { clampInt } from '@/lib/validate';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const limit = clampInt(url.searchParams.get('limit'), 100, 1, 500);
  const offset = clampInt(url.searchParams.get('offset'), 0, 0, 100000);

  const db = getDB();
  const { results } = await db.prepare(
    `SELECT u.*, COUNT(url.id) as url_count FROM users u
     LEFT JOIN urls url ON u.id = url.user_id
     GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  return NextResponse.json({ users: results });
}
