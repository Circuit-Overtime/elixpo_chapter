export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../src/lib/admin-middleware';
import { getAdminLogs } from '../../../../src/lib/db';
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const filterType = searchParams.get('type') || 'all'; // all, errors, suspensions

    const db = await getDatabase();
    const offset = (page - 1) * limit;
    const logsResult = await getAdminLogs(db, limit, offset);
    const logs = (logsResult.results || []).map((l: any) => ({
      id: l.id,
      adminId: l.admin_id,
      adminEmail: l.admin_email || null,
      action: l.action,
      resourceType: l.resource_type,
      resourceId: l.resource_id,
      changes: l.changes,
      timestamp: l.created_at,
      status: l.status,
    }));

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: logs.length,
        pages: 1,
      },
    });
  } catch (error) {
    console.error('Activity logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
