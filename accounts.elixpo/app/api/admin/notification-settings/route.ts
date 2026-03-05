export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '../../../../src/lib/admin-middleware';
import { getDatabase } from '../../../../src/lib/d1-client';
import { getNotificationSettings, updateNotificationSettings } from '../../../../src/lib/admin-notifications';

export async function GET(request: NextRequest) {
  const admin = await verifyAdminSession(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await getDatabase();
  const settings = await getNotificationSettings(db);
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdminSession(request);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await getDatabase();
  const body = await request.json();
  await updateNotificationSettings(db, body);
  const settings = await getNotificationSettings(db);
  return NextResponse.json(settings);
}
