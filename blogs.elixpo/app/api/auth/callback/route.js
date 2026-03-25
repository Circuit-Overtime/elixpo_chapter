import { NextResponse } from 'next/server';
import { getOAuthConfig, setSessionCookie } from '../../../../lib/auth';
import { getDB } from '../../../../lib/cloudflare';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/sign-in?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=missing_code', request.url));
  }

  // Validate CSRF state
  const cookieStore = request.cookies;
  const savedState = cookieStore.get('oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/sign-in?error=invalid_state', request.url));
  }

  const config = getOAuthConfig();

  // Exchange code for tokens
  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/sign-in?error=token_exchange_failed', request.url));
  }

  const tokenData = await tokenRes.json();

  // Fetch user profile from Elixpo Accounts
  const userInfoRes = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(new URL('/sign-in?error=user_info_failed', request.url));
  }

  const userInfo = await userInfoRes.json();

  // Upsert user into D1
  const db = getDB();
  const existingUser = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userInfo.id || userInfo.sub).first();

  const userId = userInfo.id || userInfo.sub;
  const now = Math.floor(Date.now() / 1000);

  if (!existingUser) {
    // New user — insert
    await db.prepare(`
      INSERT INTO users (id, email, username, display_name, avatar_url, locale, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      userInfo.email,
      userInfo.username || userInfo.preferred_username || userInfo.email.split('@')[0],
      userInfo.display_name || userInfo.name || userInfo.username || '',
      userInfo.avatar_url || userInfo.picture || '',
      userInfo.locale || 'en',
      now,
      now
    ).run();

    // Set session cookie and redirect to /intro for first-time setup
    const response = NextResponse.redirect(new URL('/intro', request.url));
    const session = JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      userId,
    });
    response.cookies.set('lixblogs_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 15, // 15 days
      path: '/',
    });
    response.cookies.delete('oauth_state');
    return response;
  }

  // Existing user — update profile fields from OAuth provider
  await db.prepare(`
    UPDATE users SET email = ?, display_name = ?, avatar_url = ?, locale = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    userInfo.email,
    userInfo.display_name || userInfo.name || '',
    userInfo.avatar_url || userInfo.picture || '',
    userInfo.locale || 'en',
    now,
    userId
  ).run();

  // Set session cookie and redirect to feed
  const response = NextResponse.redirect(new URL('/', request.url));
  const session = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
    userId,
  });
  response.cookies.set('lixblogs_session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 15, // 15 days
    path: '/',
  });
  response.cookies.delete('oauth_state');
  return response;
}
