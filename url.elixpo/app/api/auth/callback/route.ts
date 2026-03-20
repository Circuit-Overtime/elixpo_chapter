import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, fetchUserInfo, upsertUser, createSession, auditLog } from '@/lib/auth';
import { getDB, getKV, getEnv } from '@/lib/db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const env = getEnv();

  if (error) {
    return NextResponse.redirect(new URL('/login?error=access_denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=invalid_request', request.url));
  }

  // Verify state
  const kv = getKV();
  const storedState = await kv.get(`oauth_state:${state}`);
  if (!storedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
  }
  await kv.delete(`oauth_state:${state}`);

  try {
    const tokens = await exchangeCode(code, request.url);
    const userInfo = await fetchUserInfo(tokens.access_token);
    const user = await upsertUser(userInfo);

    // Store refresh token
    const db = getDB();
    await db
      .prepare(
        `INSERT INTO oauth_tokens (user_id, access_token, refresh_token, expires_at)
         VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET
         access_token = excluded.access_token, refresh_token = excluded.refresh_token,
         expires_at = excluded.expires_at, created_at = datetime('now')`
      )
      .bind(user.id, tokens.access_token, tokens.refresh_token, new Date(Date.now() + tokens.expires_in * 1000).toISOString())
      .run();

    await createSession(user.id);
    await auditLog(user.id, 'user.login', 'user', String(user.id));

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (e) {
    console.error('OAuth callback error:', e);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
