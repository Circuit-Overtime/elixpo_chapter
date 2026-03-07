export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getDatabase } from '@/lib/d1-client';

async function getAuth(request: NextRequest) {
  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyJWT(token);
  if (!payload || payload.type !== 'access') return null;
  return payload;
}

export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDatabase();
  const result = await db
    .prepare(
      `SELECT id, url, events, is_active, created_at, last_delivery_at
       FROM webhooks WHERE user_id = ? ORDER BY created_at DESC`
    )
    .bind(auth.sub)
    .all();

  const webhooks = (result.results || []).map((w: any) => ({
    ...w,
    events: typeof w.events === 'string' ? JSON.parse(w.events) : (w.events ?? []),
    is_active: Boolean(w.is_active),
  }));

  return NextResponse.json({ webhooks });
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await request.json();
  const { url, events, secret } = body as {
    url: string;
    events: string[];
    secret?: string;
  };

  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });
  if (!url.startsWith('https://')) {
    return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 });
  }
  if (!events || events.length === 0) {
    return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const webhookSecret = secret || crypto.randomUUID().replace(/-/g, '');

  const db = await getDatabase();
  await db
    .prepare(
      `INSERT INTO webhooks (id, user_id, url, events, secret, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(id, auth.sub, url, JSON.stringify(events), webhookSecret)
    .run();

  return NextResponse.json({
    id,
    url,
    events,
    secret: webhookSecret,
    is_active: true,
  }, { status: 201 });
}
