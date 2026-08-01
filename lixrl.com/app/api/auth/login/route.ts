import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizeUrl } from '@/lib/auth';
import { getKV } from '@/lib/db';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // If already logged in, go straight to dashboard
  const sessionCookie = request.cookies.get('session');
  if (sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 10 login attempts per minute per IP
  const limited = await rateLimit(request, 'login', 10, 60);
  if (limited) return limited;

  const state = crypto.randomUUID();
  const kv = getKV();
  await kv.put(`oauth_state:${state}`, '1', { expirationTtl: 600 });
  return NextResponse.redirect(getAuthorizeUrl(state, request.url));
}
