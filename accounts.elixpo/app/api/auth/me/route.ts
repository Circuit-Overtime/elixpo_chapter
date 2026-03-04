import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getUserById } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';

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

      return NextResponse.json({
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        isAdmin: !!(dbUser as any).is_admin,
        provider: payload.provider,
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
