import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, auditLog } from '@/lib/auth';
import { getDB, getKV } from '@/lib/db';
import { validateUrl, validateLength, validateFutureDate, badRequest } from '@/lib/validate';
import type { UrlRecord } from '@/lib/types';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await params;
  const db = getDB();
  const url = await db.prepare('SELECT * FROM urls WHERE short_code = ? AND user_id = ?')
    .bind(code, user.id).first<UrlRecord>();

  if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(url);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await params;
  const body: any = await request.json();
  const db = getDB();
  const kv = getKV();

  const url = await db.prepare('SELECT * FROM urls WHERE short_code = ? AND user_id = ?')
    .bind(code, user.id).first<UrlRecord>();
  if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: string[] = [];
  const bindParams: any[] = [];

  if (body.url !== undefined) {
    if (typeof body.url !== 'string') return badRequest('url must be a string');
    const urlErr = validateUrl(body.url);
    if (urlErr) return badRequest(urlErr);
    updates.push('original_url = ?'); bindParams.push(body.url);
  }
  if (body.title !== undefined) {
    if (body.title !== null && typeof body.title !== 'string') return badRequest('title must be a string or null');
    if (body.title) {
      const titleErr = validateLength(body.title, 'Title', 1, 255);
      if (titleErr) return badRequest(titleErr);
    }
    updates.push('title = ?'); bindParams.push(body.title);
  }
  if (body.is_active !== undefined) {
    updates.push('is_active = ?'); bindParams.push(body.is_active ? 1 : 0);
  }
  if (body.expires_at !== undefined) {
    if (body.expires_at !== null) {
      const dateErr = validateFutureDate(body.expires_at);
      if (dateErr) return badRequest(dateErr);
    }
    updates.push('expires_at = ?'); bindParams.push(body.expires_at);
  }

  if (updates.length === 0) return badRequest('No fields to update');

  updates.push("updated_at = datetime('now')");
  bindParams.push(code, user.id);

  await db.prepare(`UPDATE urls SET ${updates.join(', ')} WHERE short_code = ? AND user_id = ?`)
    .bind(...bindParams).run();

  // Sync KV cache
  const newUrl = body.url || url.original_url;
  const isActive = body.is_active !== undefined ? body.is_active : !!url.is_active;
  if (isActive) {
    kv.put(`url:${code}`, JSON.stringify({ url: newUrl, id: url.id })).catch(() => {});
  } else {
    kv.delete(`url:${code}`).catch(() => {});
  }

  auditLog(user.id, 'url.update', 'url', code).catch(() => {});
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await params;
  const db = getDB();
  const kv = getKV();

  const url = await db.prepare('SELECT id FROM urls WHERE short_code = ? AND user_id = ?')
    .bind(code, user.id).first();
  if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.prepare('DELETE FROM urls WHERE short_code = ? AND user_id = ?').bind(code, user.id).run();
  kv.delete(`url:${code}`).catch(() => {});
  auditLog(user.id, 'url.delete', 'url', code).catch(() => {});

  return NextResponse.json({ success: true });
}
