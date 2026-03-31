export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50);

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();

    const result = await db.prepare(
      'SELECT tag, COUNT(*) as count FROM blog_tags GROUP BY tag ORDER BY count DESC LIMIT ?'
    ).bind(limit).all();

    return NextResponse.json({ tags: result?.results || [] });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
