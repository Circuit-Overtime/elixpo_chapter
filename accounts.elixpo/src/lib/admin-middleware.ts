import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from './jwt';
import { getUserById } from './db';
import { getDatabase } from './d1-client';

export interface AdminSession {
  userId: string;
  email: string;
  isAdmin: boolean;
  role: string;
}

export async function verifyAdminSession(
  request: NextRequest
): Promise<AdminSession | null> {
  try {
    // Accept token from httpOnly cookie or Authorization header
    const cookieToken = request.cookies.get('access_token')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return null;
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.type !== 'access') {
      return null;
    }

    // Always verify against DB to ensure admin privilege is current
    try {
      const db = await getDatabase();
      const dbUser = await getUserById(db, payload.sub);

      if (!dbUser || !(dbUser as any).is_active) {
        return null;
      }

      const isAdmin = !!(dbUser as any).is_admin;
      if (!isAdmin) {
        return null;
      }

      return {
        userId: payload.sub,
        email: payload.email,
        isAdmin: true,
        role: (dbUser as any).role || 'admin',
      };
    } catch (dbError) {
      console.error('[AdminMiddleware] DB lookup failed, using JWT payload:', dbError);
      // Fallback to JWT payload
      if (!payload.isAdmin) {
        return null;
      }
      return {
        userId: payload.sub,
        email: payload.email,
        isAdmin: true,
        role: 'admin',
      };
    }
  } catch (error) {
    console.error('Admin session verification failed:', error);
    return null;
  }
}

export function requireAdmin(handler: Function) {
  return async (request: NextRequest) => {
    const session = await verifyAdminSession(request);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    return handler(request, session);
  };
}
