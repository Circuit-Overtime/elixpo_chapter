import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../src/lib/admin-middleware';
import { listAdminUsers, countUsers, setUserAdminStatus, setUserActiveStatus, logAdminAction } from '../../../../src/lib/db';
import { getDatabase } from '../../../../src/lib/d1-client';
import { generateUUID } from '../../../../src/lib/crypto';

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(request);

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    const db = await getDatabase();

    const [usersResult, total] = await Promise.all([
      listAdminUsers(db, limit, offset, search),
      countUsers(db, search),
    ]);

    const users = (usersResult.results || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      isAdmin: !!(u.is_admin),
      isActive: !!(u.is_active),
      createdAt: u.created_at,
      lastLogin: u.last_login,
      emailVerified: !!(u.email_verified),
      role: u.role || 'user',
    }));

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Users list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await verifyAdminSession(request);

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing userId or action' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    switch (action) {
      case 'toggle_admin': {
        // Fetch current status
        const userRow = await db.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first() as any;
        if (!userRow) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const newAdminStatus = !userRow.is_admin;
        await setUserAdminStatus(db, userId, newAdminStatus);
        await logAdminAction(db, {
          id: generateUUID(),
          adminId: session.userId,
          action: 'toggle_admin',
          resourceType: 'user',
          resourceId: userId,
          changes: { is_admin: newAdminStatus },
          ipAddress,
          userAgent,
        });
        return NextResponse.json({
          success: true,
          message: `Admin status ${newAdminStatus ? 'granted' : 'revoked'}`,
          userId,
          isAdmin: newAdminStatus,
        });
      }

      case 'suspend': {
        await setUserActiveStatus(db, userId, false);
        await logAdminAction(db, {
          id: generateUUID(),
          adminId: session.userId,
          action: 'suspend_user',
          resourceType: 'user',
          resourceId: userId,
          changes: { is_active: false },
          ipAddress,
          userAgent,
        });
        return NextResponse.json({ success: true, message: 'User suspended', userId });
      }

      case 'activate': {
        await setUserActiveStatus(db, userId, true);
        await logAdminAction(db, {
          id: generateUUID(),
          adminId: session.userId,
          action: 'activate_user',
          resourceType: 'user',
          resourceId: userId,
          changes: { is_active: true },
          ipAddress,
          userAgent,
        });
        return NextResponse.json({ success: true, message: 'User activated', userId });
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('User action error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
