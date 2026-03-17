export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../src/lib/admin-middleware';
import { logAdminAction } from '../../../../src/lib/db';
import { getDatabase } from '../../../../src/lib/d1-client';
import { generateUUID } from '../../../../src/lib/webcrypto';

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

    const db = await getDatabase();
    const offset = (page - 1) * limit;

    const [appsResult, countResult] = await Promise.all([
      search
        ? db.prepare(
            `SELECT oc.client_id as id, oc.name, oc.is_active, oc.created_at, oc.last_used, oc.request_count,
               u.id as owner_id, u.email as owner_email
             FROM oauth_clients oc
             LEFT JOIN users u ON oc.owner_id = u.id
             WHERE oc.name LIKE ? OR u.email LIKE ?
             ORDER BY oc.created_at DESC LIMIT ? OFFSET ?`
          ).bind(`%${search}%`, `%${search}%`, limit, offset).all()
        : db.prepare(
            `SELECT oc.client_id as id, oc.name, oc.is_active, oc.created_at, oc.last_used, oc.request_count,
               u.id as owner_id, u.email as owner_email
             FROM oauth_clients oc
             LEFT JOIN users u ON oc.owner_id = u.id
             ORDER BY oc.created_at DESC LIMIT ? OFFSET ?`
          ).bind(limit, offset).all(),
      search
        ? db.prepare(
            `SELECT COUNT(*) as count FROM oauth_clients oc LEFT JOIN users u ON oc.owner_id = u.id WHERE oc.name LIKE ? OR u.email LIKE ?`
          ).bind(`%${search}%`, `%${search}%`).first()
        : db.prepare('SELECT COUNT(*) as count FROM oauth_clients').first(),
    ]);

    const apps = (appsResult.results || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      owner: { id: a.owner_id, email: a.owner_email },
      status: a.is_active ? 'active' : 'suspended',
      createdAt: a.created_at,
      lastUsed: a.last_used,
      requestCount: a.request_count || 0,
      requests: a.request_count || 0,
    }));

    const total = (countResult as any)?.count || 0;

    return NextResponse.json({
      apps,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Apps list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/apps
 * Suspend or activate an OAuth application.
 * Body: { appId, action: 'suspend' | 'activate' }
 */
export async function PATCH(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { appId, action } = (await request.json()) as { appId?: string; action?: string };
    if (!appId || !action) return NextResponse.json({ error: 'appId and action are required' }, { status: 400 });

    const db = await getDatabase();
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'suspend') {
      await db.prepare('UPDATE oauth_clients SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?').bind(appId).run();
    } else if (action === 'activate') {
      await db.prepare('UPDATE oauth_clients SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?').bind(appId).run();
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    await logAdminAction(db, {
      id: generateUUID(),
      adminId: session.userId,
      action: `${action}_app`,
      resourceType: 'oauth_client',
      resourceId: appId,
      changes: { is_active: action === 'activate' },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, message: `App ${action === 'suspend' ? 'suspended' : 'activated'}` });
  } catch (error) {
    console.error('App action error:', error);
    return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/apps
 * Permanently delete an OAuth application.
 * Body: { appId }
 */
export async function DELETE(request: NextRequest) {
  const session = await verifyAdminSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { appId } = (await request.json()) as { appId?: string };
    if (!appId) return NextResponse.json({ error: 'appId is required' }, { status: 400 });

    const db = await getDatabase();
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Fetch app info for logging
    const app = await db.prepare('SELECT name, owner_id FROM oauth_clients WHERE client_id = ?').bind(appId).first() as any;
    if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    // Delete associated auth requests, then the app
    await db.prepare('DELETE FROM auth_requests WHERE client_id = ?').bind(appId).run();
    await db.prepare('DELETE FROM refresh_tokens WHERE client_id = ?').bind(appId).run();
    await db.prepare('DELETE FROM oauth_clients WHERE client_id = ?').bind(appId).run();

    await logAdminAction(db, {
      id: generateUUID(),
      adminId: session.userId,
      action: 'delete_app',
      resourceType: 'oauth_client',
      resourceId: appId,
      changes: { name: app.name, deleted: true },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, message: 'App deleted' });
  } catch (error) {
    console.error('App delete error:', error);
    return NextResponse.json({ error: 'Failed to delete application' }, { status: 500 });
  }
}
