export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getUserById } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';
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
 * GET /api/auth/me
 * Get current user from access token (cookie or Authorization header)
 * Used by frontend to check auth status and get user info
 */
export async function GET(request: NextRequest) {
  try {
    // Accept token from httpOnly cookie or Authorization header
    const cookieToken = request.cookies.get('access_token')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const accessToken = cookieToken || headerToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token' },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(accessToken);

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
 * Update current user profile fields (locale, timezone)
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
    const { locale, timezone } = body as { locale?: string; timezone?: string };

    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: (string | null)[] = [];

    if (locale !== undefined) {
      setClauses.push('locale = ?');
      values.push(locale);
    }
    if (timezone !== undefined) {
      setClauses.push('timezone = ?');
      values.push(timezone);
    }

    if (values.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    values.push(payload.sub);

    try {
      const db = await getDatabase();
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
