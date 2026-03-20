import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, auditLog } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { isValidRole, isValidTier, badRequest } from '@/lib/validate';

export const runtime = 'edge';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await resolveUser(request);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const userId = parseInt(id);
  if (isNaN(userId)) return badRequest('Invalid user ID');

  const body: any = await request.json();
  const db = getDB();

  // Validate role
  if (body.role !== undefined) {
    if (!isValidRole(body.role)) return badRequest('role must be "user" or "admin"');
  }

  // Validate tier
  if (body.tier !== undefined) {
    if (!isValidTier(body.tier)) return badRequest('tier must be free, pro, business, or enterprise');
  }

  if (body.role === 'admin') {
    const adminCount = await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
      .first<{ count: number }>();
    if ((adminCount?.count || 0) >= 15) {
      return badRequest('Maximum admin accounts (15) reached');
    }
  }

  const updates: string[] = [];
  const bindParams: any[] = [];
  if (body.role !== undefined) { updates.push('role = ?'); bindParams.push(body.role); }
  if (body.tier !== undefined) { updates.push('tier = ?'); bindParams.push(body.tier); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); bindParams.push(body.is_active ? 1 : 0); }

  if (updates.length === 0) return badRequest('No fields to update');

  bindParams.push(userId);
  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...bindParams).run();
  auditLog(user.id, 'admin.user.update', 'user', String(userId), JSON.stringify(body)).catch(() => {});

  return NextResponse.json({ success: true });
}
