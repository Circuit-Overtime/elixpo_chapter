export const runtime = 'edge';
import { NextResponse } from 'next/server';

// Server-initiated OAuth login. Generates the CSRF `state`, sets it in an
// httpOnly cookie (so client JS can't forge it), and redirects to the
// Elixpo Accounts authorize endpoint. The callback verifies the cookie.
export async function GET(request) {
  const state = crypto.randomUUID();
  const url = new URL(request.url);
  const origin = url.origin;

  // Post-login redirect target — only same-site relative paths allowed (no open redirect).
  const next = url.searchParams.get('next') || '';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_ELIXPO_CLIENT_ID || '',
    redirect_uri: `${origin}/api/auth/callback`,
    state,
    scope: 'openid profile email',
  });

  const res = NextResponse.redirect(`https://accounts.elixpo.com/oauth/authorize?${params}`);
  const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 600, path: '/' };
  res.cookies.set('oauth_state', state, cookieOpts);
  if (safeNext) res.cookies.set('oauth_next', safeNext, cookieOpts);
  return res;
}
