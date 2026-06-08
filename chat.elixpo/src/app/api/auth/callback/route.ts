import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeOAuthCode } from '@/lib/auth/oauth';
import { createSession } from '@/lib/auth/session';

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('oauth_state')?.value;
  const codeVerifier = cookieStore.get('oauth_verifier')?.value;

  if (!savedState || !codeVerifier) {
    return NextResponse.json({ error: 'OAuth session expired or invalid' }, { status: 400 });
  }

  if (state !== savedState) {
    return NextResponse.json({ error: 'State mismatch (CSRF)' }, { status: 400 });
  }

  try {
    const env = {
      ELIXPO_CLIENT_ID: process.env.ELIXPO_CLIENT_ID!,
      ELIXPO_CLIENT_SECRET: process.env.ELIXPO_CLIENT_SECRET!,
      NEXT_PUBLIC_ELIXPO_SSO_URL: process.env.NEXT_PUBLIC_ELIXPO_SSO_URL!,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
    };

    const tokenData = await exchangeOAuthCode(code, codeVerifier, env);

    // @ts-ignore
    const sessionEnv = {
      ELIXPO_SESSIONS: process.env.ELIXPO_SESSIONS as unknown as KVNamespace,
      JWT_SECRET: process.env.JWT_SECRET!,
    };

    const jwt = await createSession(
      {
        userId: tokenData.user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
      },
      sessionEnv
    );

    // Clear OAuth temporary cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_verifier');

    // Set session cookie
    cookieStore.set('elixpo_session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error: any) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.json({ error: 'Failed to authenticate', details: error.message }, { status: 500 });
  }
}
