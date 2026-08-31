export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getDB } from '../../../../lib/cloudflare';
import { decryptPollinationsToken, inspectPollinationsToken, pollinationsEnabled, publicConnection } from '../../../../lib/pollinations';

async function context() {
  const session = await getSession();
  return session?.userId ? { userId: session.userId, db: getDB() } : null;
}

async function connection(db, userId) {
  return db.prepare('SELECT * FROM pollinations_connections WHERE user_id = ?').bind(userId).first();
}

async function refresh(db, row) {
  const now = Math.floor(Date.now() / 1000);
  if (!row || (row.cache_expires_at || 0) > now) return row;
  if (row.expires_at && row.expires_at <= now) {
    await db.prepare("UPDATE pollinations_connections SET status='expired', updated_at=? WHERE user_id=?").bind(now, row.user_id).run();
    return { ...row, status: 'expired' };
  }
  try {
    const token = await decryptPollinationsToken(row);
    const info = await inspectPollinationsToken(token);
    const balance = Number(info.balance?.balance ?? info.balance?.pollen ?? info.balance);
    await db.prepare(`UPDATE pollinations_connections SET key_valid=?, key_type=?, key_permissions=?,
      account_handle=?, account_avatar=?, balance=?, approved_budget=?, usage_summary=?, cache_expires_at=?,
      status='connected', last_checked_at=?, last_error_code=NULL, updated_at=? WHERE user_id=?`)
      .bind(info.key?.valid === false ? 0 : 1, info.key?.type || null, JSON.stringify(info.key?.permissions || []),
        info.profile?.githubUsername || info.profile?.name || null, info.profile?.image || null,
        Number.isFinite(balance) ? balance : null, info.key?.budget ?? row.approved_budget ?? null,
        JSON.stringify(info.usage || null), now + 45, now, now, row.user_id).run();
  } catch (error) {
    const status = error?.code === 'revoked' ? 'revoked' : 'error';
    await db.prepare('UPDATE pollinations_connections SET status=?, last_error_code=?, last_checked_at=?, cache_expires_at=?, updated_at=? WHERE user_id=?')
      .bind(status, error?.code || 'provider_unavailable', now, now + 30, now, row.user_id).run();
  }
  return connection(db, row.user_id);
}

export async function GET(request) {
  const auth = await context();
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!pollinationsEnabled()) return NextResponse.json({ enabled: false, comingSoon: true, ...publicConnection(null) });
  try {
    let row = await connection(auth.db, auth.userId);
    if (new URL(request.url).searchParams.get('refresh') === '1' && row) row = { ...row, cache_expires_at: 0 };
    row = await refresh(auth.db, row);
    return NextResponse.json({ enabled: true, comingSoon: true, ...publicConnection(row) });
  } catch (error) {
    const missingTable = String(error?.message || '').includes('no such table');
    return NextResponse.json({ error: missingTable ? 'Pollinations migration is not applied' : 'Unable to load Pollinations connection' }, { status: 503 });
  }
}

export async function DELETE() {
  const auth = await context();
  if (!auth) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  await auth.db.prepare('DELETE FROM pollinations_connections WHERE user_id = ?').bind(auth.userId).run();
  return NextResponse.json({ enabled: pollinationsEnabled(), comingSoon: true, ...publicConnection(null) });
}
