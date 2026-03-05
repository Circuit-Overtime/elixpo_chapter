export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../src/lib/admin-middleware';
import { getDatabase } from '../../../../src/lib/d1-client';
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
} from '../../../../src/lib/admin-notifications';

export async function GET(request: NextRequest) {
  const admin = await verifyAdminSession(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const db = await getDatabase();
  const notifications = await getAdminNotifications(db, unreadOnly);
  const unreadCount = await countUnreadNotifications(db);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const admin = await verifyAdminSession(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, markAll } = await request.json();
  const db = await getDatabase();

  if (markAll) {
    await markAllNotificationsRead(db);
  } else if (id) {
    await markNotificationRead(db, id);
  }

  return NextResponse.json({ success: true });
}
