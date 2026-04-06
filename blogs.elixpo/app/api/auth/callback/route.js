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
  const redirectBase = new URL(request.url).origin;
  const redirectUri = `${redirectBase}/api/auth/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
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
    const existingUser = await db.prepare('SELECT id, account_status FROM users WHERE id = ?').bind(userId).first();

    // Block permanently deleted accounts
    if (existingUser?.account_status === 'removed') {
      return NextResponse.redirect(new URL('/sign-in?error=account_deleted', redirectBase));
    }
    const now = Math.floor(Date.now() / 1000);

    if (!existingUser) {
      isNewUser = true;
      const username = (userInfo.displayName || userInfo.email.split('@')[0]).toLowerCase().replace(/[^\w-]/g, '');

      // Mirror OAuth avatar to Cloudinary at deterministic path
      let avatarUrl = userInfo.avatar || '';
      try {
        if (avatarUrl) {
          const { uploadRemoteAvatar, userAvatarPublicId, userAvatarCdnUrl } = await import('../../../../lib/cloudinary');
          await uploadRemoteAvatar(avatarUrl, userAvatarPublicId(username));
          avatarUrl = userAvatarCdnUrl(username);
        }
      } catch (e) { console.warn('Avatar mirror failed:', e.message); }

      await db.prepare(`
        INSERT INTO users (id, email, username, display_name, avatar_url, locale, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        userInfo.email,
        username,
        userInfo.displayName || '',
        avatarUrl,
        'en',
        now,
        now
      ).run();

      // Reserve username in shared namespace (atomic — ignores if already taken)
      try {
        const { tryReserveName } = await import('../../../../lib/namespace');
        await tryReserveName(db, username, 'user', userId);
      } catch { /* namespace table may not exist in local dev */ }
    } else {
      // Get username for deterministic avatar path
      const existingData = await db.prepare('SELECT username FROM users WHERE id = ?').bind(userId).first();
      const username = existingData?.username || userId;

      let avatarUrl = userInfo.avatar || '';
      try {
        if (avatarUrl) {
          const { uploadRemoteAvatar, userAvatarPublicId, userAvatarCdnUrl } = await import('../../../../lib/cloudinary');
          await uploadRemoteAvatar(avatarUrl, userAvatarPublicId(username));
          avatarUrl = userAvatarCdnUrl(username);
        }
      } catch (e) { console.warn('Avatar mirror failed:', e.message); }

      await db.prepare(`
        UPDATE users SET email = ?, display_name = ?, avatar_url = ?, account_status = 'active', updated_at = ?
        WHERE id = ?
      `).bind(
        userInfo.email,
        userInfo.displayName || '',
        avatarUrl,
        now,
        userId
      ).run();
    }
  } catch (e) {
    // D1 not available (local dev) — user data lives in session cookie only
    console.warn('D1 not available, skipping user upsert:', e.message);
  }

  // Send login alert email (fire and forget)
  if (!isNewUser && userInfo.email) {
    try {
      const { sendLoginAlert } = await import('../../../../lib/email');
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '';
      const city = request.headers.get('cf-ipcity') || '';
      const country = request.headers.get('cf-ipcountry') || '';
      const location = [city, country].filter(Boolean).join(', ') || 'Unknown location';
      const ua = request.headers.get('user-agent') || '';
      const time = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
      sendLoginAlert(userInfo.email, { displayName: userInfo.displayName, ip, location, userAgent: ua, time }).catch(() => {});
    } catch {}
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
      username: (userInfo.displayName || userInfo.email.split('@')[0]).toLowerCase().replace(/[^\w-]/g, ''),
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
