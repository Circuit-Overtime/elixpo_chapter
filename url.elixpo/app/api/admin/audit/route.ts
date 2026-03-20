import { NextRequest, NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth';
import { getDB } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getDB();
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const { results } = await db.prepare(
    `SELECT al.*, u.display_name as user_name, u.email as user_email
     FROM audit_log al LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  return NextResponse.json({ logs: results });
}
