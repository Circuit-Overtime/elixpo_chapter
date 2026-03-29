export const runtime = 'edge';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get('name') || '').trim().toLowerCase();

  if (!name || name.length < 2) {
    return NextResponse.json({ available: false, error: 'Name too short' });
  }

  try {
    const { getDB } = await import('../../../lib/cloudflare');
    const { checkNameAvailable } = await import('../../../lib/namespace');
    const db = getDB();
    const result = await checkNameAvailable(db, name);
    return NextResponse.json(result);
  } catch {
    // D1 not available — assume available in local dev
    return NextResponse.json({ available: true });
  }
}
