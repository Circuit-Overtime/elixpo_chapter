import { NextRequest, NextResponse } from 'next/server';
import { generatePKCE } from '@/lib/auth/oauth';

export async function GET(request: NextRequest) {
  const { codeVerifier, codeChallenge, state } = await generatePKCE();

  const clientId = process.env.ELIXPO_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  const ssoUrl = process.env.NEXT_PUBLIC_ELIXPO_SSO_URL;

  if (!clientId || !ssoUrl) {
    return NextResponse.json({ error: 'OAuth configuration is missing' }, { status: 500 });
  }

  const authUrl = new URL(`${ssoUrl}/oauth/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl.toString());

  // Store verifier and state in cookies temporarily (HttpOnly, max 10 mins)
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set('oauth_verifier', codeVerifier, {
    httpOnly: true,
    secure: isProd,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  });
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
