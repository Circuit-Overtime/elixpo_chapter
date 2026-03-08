export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, createAccessToken, createRefreshToken } from '@/lib/jwt';
import { getUserById, getRefreshTokenByHash, revokeRefreshToken, createRefreshToken as storeRefreshToken } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';
import { hashString, generateUUID } from '@/lib/webcrypto';
import type { D1Database } from '@cloudflare/workers-types';

async function getUserIdentity(db: D1Database, userId: string) {
  try {
    return await db
      .prepare('SELECT provider, provider_email, provider_profile_url FROM identities WHERE user_id = ? ORDER BY created_at ASC LIMIT 1')
      .bind(userId)
      .first();
  } catch {
    return null;
  }
}

/**
 * Auto-refresh: verify the refresh token, issue new access + refresh tokens,
 * set cookies, and return the user profile in one round-trip.
 */
async function tryAutoRefresh(request: NextRequest, refreshToken: string) {
  try {
    const payload = await verifyJWT(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const db = await getDatabase();
    const refreshTokenHash = await hashString(refreshToken);
    const tokenRecord = await getRefreshTokenByHash(db, refreshTokenHash);
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Refresh token revoked' }, { status: 401 });
    }

    const user = await getUserById(db, payload.sub) as any;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const isAdmin = !!(user.is_admin);
    const accessMaxAge = parseInt(process.env.JWT_EXPIRATION_MINUTES || '15') * 60;

    // Determine remaining session duration from the refresh token's own expiry
    const refreshRemainingSeconds = Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);
    // Use at least 1 day, or the remaining time on the current refresh token
    const refreshDays = Math.max(Math.ceil(refreshRemainingSeconds / 86400), 1);

    const newAccessToken = await createAccessToken(
      payload.sub, user.email, payload.provider, parseInt(process.env.JWT_EXPIRATION_MINUTES || '15'), isAdmin
    );
    const newRefreshToken = await createRefreshToken(payload.sub, payload.provider, refreshDays);
    const newRefreshTokenHash = await hashString(newRefreshToken);

    // Rotate refresh token
    await revokeRefreshToken(db, refreshTokenHash);
    await storeRefreshToken(db, {
      id: generateUUID(),
      userId: payload.sub,
      tokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
    });

    const identity = await getUserIdentity(db, payload.sub);

    const response = NextResponse.json({
      id: payload.sub,
      userId: payload.sub,
      email: user.email,
      displayName: user.display_name || null,
      isAdmin,
      provider: payload.provider || (identity as any)?.provider || 'email',
      avatar: (identity as any)?.provider_profile_url || null,
      emailVerified: !!(user.email_verified),
      expiresAt: new Date(Date.now() + accessMaxAge * 1000),
    });

    // Set refreshed cookies
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: accessMaxAge, path: '/',
    });
    response.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: refreshDays * 86400, path: '/',
    });
    response.cookies.set('user_id', payload.sub, {
      httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: refreshDays * 86400, path: '/',
    });

    console.log(`[Me] Auto-refreshed session for user ${payload.sub}`);
    return response;
  } catch (err) {
    console.error('[Me] Auto-refresh failed:', err);
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }
}

/**
 * GET /api/auth/me
 * Get current user from access token (cookie or Authorization header)
 * Used by frontend to check auth status and get user info
 */
export async function GET(request: NextRequest) {
  try {
    // Accept token from httpOnly cookie or Authorization header
    const cookieToken = request.cookies.get('access_token')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const refreshTokenCookie = request.cookies.get('refresh_token')?.value;
    const accessToken = cookieToken || headerToken;

    // If no access token but refresh token cookie exists, try auto-refresh
    if (!accessToken && refreshTokenCookie) {
      return await tryAutoRefresh(request, refreshTokenCookie);
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token' },
        { status: 401 }
      );
    }

    let payload = await verifyJWT(accessToken);

    // Access token expired but refresh token cookie exists — auto-refresh
    if ((!payload || payload.type !== 'access') && refreshTokenCookie && cookieToken) {
      return await tryAutoRefresh(request, refreshTokenCookie);
    }

    if (!payload || payload.type !== 'access') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch fresh user data from DB to ensure isAdmin is current
    try {
      const db = await getDatabase();
      const dbUser = await getUserById(db, payload.sub);

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      const identity = await getUserIdentity(db, payload.sub);

      return NextResponse.json({
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        displayName: (dbUser as any).display_name || null,
        isAdmin: !!(dbUser as any).is_admin,
        provider: payload.provider || (identity as any)?.provider || 'email',
        avatar: (identity as any)?.provider_profile_url || null,
        emailVerified: !!(dbUser as any).email_verified,
        expiresAt: new Date(payload.exp * 1000),
      });
    } catch (dbError) {
      // Fallback to JWT payload if DB unavailable
      console.error('[Me] DB lookup failed, using JWT payload:', dbError);
      return NextResponse.json({
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin ?? false,
        provider: payload.provider,
        expiresAt: new Date(payload.exp * 1000),
      });
    }
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/me
 * Update current user profile fields (locale, timezone, display_name)
 * display_name: max 2 changes per 14 days
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get('access_token')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const accessToken = cookieToken || headerToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    const payload = await verifyJWT(accessToken);
    if (!payload || payload.type !== 'access') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body: any = await request.json();
    const { locale, timezone, display_name } = body as { locale?: string; timezone?: string; display_name?: string };

    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: (string | number | null)[] = [];

    if (locale !== undefined) {
      setClauses.push('locale = ?');
      values.push(locale);
    }
    if (timezone !== undefined) {
      setClauses.push('timezone = ?');
      values.push(timezone);
    }

    const db = await getDatabase();

    if (display_name !== undefined) {
      const trimmed = display_name.trim();
      if (trimmed.length < 2 || trimmed.length > 32) {
        return NextResponse.json({ error: 'Display name must be 2-32 characters.' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
        return NextResponse.json({ error: 'Only letters, numbers, spaces, hyphens and underscores are allowed.' }, { status: 400 });
      }

      // Rate limit: 2 changes per 14 days
      const currentUser = await getUserById(db, payload.sub) as any;
      if (!currentUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const changeCount = currentUser.display_name_change_count || 0;
      const lastChanged = currentUser.display_name_changed_at ? new Date(currentUser.display_name_changed_at).getTime() : 0;
      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
      const windowExpired = Date.now() - lastChanged > twoWeeksMs;

      // Reset counter if the 2-week window has passed
      const effectiveCount = windowExpired ? 0 : changeCount;

      if (effectiveCount >= 2) {
        const resetDate = new Date(lastChanged + twoWeeksMs);
        return NextResponse.json({
          error: `You can only change your display name 2 times every 2 weeks. Try again after ${resetDate.toLocaleDateString()}.`,
        }, { status: 429 });
      }

      setClauses.push('display_name = ?');
      values.push(trimmed);
      setClauses.push('display_name_changed_at = CURRENT_TIMESTAMP');
      setClauses.push('display_name_change_count = ?');
      values.push(effectiveCount + 1);
    }

    if (values.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    values.push(payload.sub);

    try {
      await db
        .prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run();

      const dbUser = await getUserById(db, payload.sub);
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        displayName: (dbUser as any).display_name || null,
        locale: (dbUser as any).locale ?? null,
        timezone: (dbUser as any).timezone ?? null,
        isAdmin: !!(dbUser as any).is_admin,
        provider: payload.provider,
      });
    } catch (dbError) {
      console.error('[Me] PATCH DB error:', dbError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Me] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update user info' }, { status: 500 });
  }
}
