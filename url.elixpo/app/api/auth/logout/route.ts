import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export const runtime = 'edge';

export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true });
}
