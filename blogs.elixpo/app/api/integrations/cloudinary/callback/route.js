export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';
import { getDB } from '../../../../../lib/cloudflare';
import { testCloudinaryConfig } from '../../../../../lib/cloudinary';
import { USER_CLOUDINARY, saveCloudinaryOAuthConnection } from '../../../../../lib/cloudinaryConnections';
import {
  exchangeCloudinaryCode,
  resolveCloudinaryCloudName,
  revokeCloudinaryToken,
} from '../../../../../lib/cloudinaryOAuth';

function finish(request, result) {
  const savedNext = request.cookies.get('cloudinary_oauth_next')?.value || '';
  const safeNext = savedNext.startsWith('/') && !savedNext.startsWith('//')
    ? savedNext
    : '/settings?tab=integrations';
  const destination = new URL(safeNext, request.url);
  destination.searchParams.set('cloudinary', result);
  const response = NextResponse.redirect(destination);
  response.cookies.delete('cloudinary_oauth_state');
  response.cookies.delete('cloudinary_oauth_next');
  return response;
}

export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.redirect(new URL('/sign-in', request.url));

  const callbackUrl = new URL(request.url);
  if (callbackUrl.searchParams.get('error')) return finish(request, 'denied');

  const code = callbackUrl.searchParams.get('code');
  const state = callbackUrl.searchParams.get('state');
  const savedState = request.cookies.get('cloudinary_oauth_state')?.value;
  if (!code || !state || !savedState || state !== savedState) return finish(request, 'invalid_state');

  let tokens;
  try {
    tokens = await exchangeCloudinaryCode({ code, origin: callbackUrl.origin });
    if (!tokens.refresh_token) throw new Error('Offline Access did not issue a refresh token');

    const cloudName = await resolveCloudinaryCloudName(tokens, callbackUrl);
    if (!/^[a-z][a-z0-9-]{1,127}$/i.test(cloudName)) {
      throw new Error('Cloudinary did not identify the selected product environment');
    }

    await testCloudinaryConfig({ cloudName, oauthToken: tokens.access_token });
    const db = getDB();
    const existing = await db.prepare(
      'SELECT cloud_name FROM cloudinary_connections WHERE user_id = ?',
    ).bind(session.userId).first();
    if (existing && existing.cloud_name !== cloudName) {
      const usage = await db.prepare(`
        SELECT COUNT(*) AS count FROM media_uploads
        WHERE user_id = ? AND storage_provider = ?
      `).bind(session.userId, USER_CLOUDINARY).first();
      if (Number(usage?.count || 0) > 0) {
        await revokeCloudinaryToken(tokens.refresh_token).catch(() => {});
        return finish(request, 'storage_in_use');
      }
    }

    await saveCloudinaryOAuthConnection(db, session.userId, {
      cloudName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });
    return finish(request, 'connected');
  } catch (error) {
    console.error('[cloudinary/oauth] Callback failed:', error?.message || error);
    if (tokens?.refresh_token) await revokeCloudinaryToken(tokens.refresh_token).catch(() => {});
    return finish(request, 'failed');
  }
}
