export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getOAuthConfig } from '../../../../lib/auth';

const SESSION_MAX_AGE = 60 * 60 * 24 * 15; // 15 days

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
    const errorBody = await tokenRes.text();
    console.error('Token exchange failed:', tokenRes.status, errorBody);
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
  const userId = userInfo.id || userInfo.userId || userInfo.sub;
  let isNewUser = false;

  // Try to upsert user into D1 (only works in Cloudflare edge runtime)
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const existingUser = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
    const now = Math.floor(Date.now() / 1000);

    if (!existingUser) {
      isNewUser = true;
      const username = userInfo.displayName || userInfo.email.split('@')[0];
      await db.prepare(`
        INSERT INTO users (id, email, username, display_name, avatar_url, locale, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        userInfo.email,
        username,
        userInfo.displayName || '',
        userInfo.avatar || '',
        'en',
        now,
        now
      ).run();

      // Reserve username in shared namespace
      try {
        await db.prepare(
          'INSERT OR IGNORE INTO namespaces (name, owner_type, owner_id, created_at) VALUES (?, ?, ?, ?)'
        ).bind(username.toLowerCase(), 'user', userId, now).run();
      } catch { /* namespace may not exist yet in local dev */ }
    } else {
      await db.prepare(`
        UPDATE users SET email = ?, display_name = ?, avatar_url = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        userInfo.email,
        userInfo.displayName || '',
        userInfo.avatar || '',
        now,
        userId
      ).run();
    }
  } catch (e) {
    // D1 not available (local dev) — user data lives in session cookie only
    console.warn('D1 not available, skipping user upsert:', e.message);
  }

  // Build session with user profile from OAuth provider
  const session = JSON.stringify({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
    userId,
    // Cache user profile in cookie so /api/auth/me works without D1
    profile: {
      id: userId,
      email: userInfo.email,
      username: userInfo.displayName || userInfo.email.split('@')[0],
      display_name: userInfo.displayName || '',
      avatar_url: userInfo.avatar || '',
      isAdmin: userInfo.isAdmin || false,
    },
  });

  const redirectTo = '/';
  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set('lixblogs_session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  response.cookies.delete('oauth_state');
  return response;
}
