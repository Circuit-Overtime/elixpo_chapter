import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../src/lib/admin-middleware';
import { getDatabase } from '../../../../src/lib/d1-client';

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
