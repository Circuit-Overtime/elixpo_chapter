export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  const session = await getSession().catch(() => null);

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const { getSearchSuggestions, recordSearch } = await import('../../../../lib/taste');
    const db = getDB();

    const suggestions = await getSearchSuggestions(db, session?.userId, q, 8);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}

// POST — record a search query
export async function POST(request) {
  const session = await getSession().catch(() => null);
  if (!session?.userId) return NextResponse.json({ ok: true });

  const { query, resultCount } = await request.json();

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const { recordSearch } = await import('../../../../lib/taste');
    const db = getDB();

    await recordSearch(db, session.userId, query, resultCount || 0);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
