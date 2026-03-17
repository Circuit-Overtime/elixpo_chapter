export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString, generateUUID } from '@/lib/webcrypto';
import { verifyJWT } from '@/lib/jwt';
import { getOAuthClientById, createAuthRequest, getAuthRequestByState } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';

// Built-in/trusted domains auto-whitelisted
const BUILTIN_DOMAINS = ['elixpo.com', 'www.elixpo.com'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const responseType = searchParams.get('response_type');
    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const scope = searchParams.get('scope') || 'openid profile email';
    const state = searchParams.get('state');
    const nonce = searchParams.get('nonce');

    if (!responseType || !clientId || !redirectUri || !state) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing required: response_type, client_id, redirect_uri, state' },
        { status: 400 }
      );
    }

    if (responseType !== 'code') {
      return NextResponse.json(
        { error: 'unsupported_response_type', error_description: 'Only response_type=code is supported' },
        { status: 400 }
      );
    }

    let redirectUrl: URL;
    try {
      redirectUrl = new URL(redirectUri);
      if (redirectUrl.protocol !== 'https:' && redirectUrl.protocol !== 'http:') {
        throw new Error('Must use HTTP or HTTPS');
      }
    } catch {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect_uri: must be valid URL with HTTP or HTTPS' },
        { status: 400 }
      );
    }

    const isBuiltinClient = BUILTIN_DOMAINS.includes(redirectUrl.hostname);
    const db = await getDatabase();

    if (!isBuiltinClient) {
      try {
        const client = await getOAuthClientById(db, clientId);
        if (!client) {
          return NextResponse.json(
            { error: 'invalid_client', error_description: 'Client not found or not active' },
            { status: 401 }
          );
        }
        const redirectUris = JSON.parse((client as any).redirect_uris || '[]');
        if (!redirectUris.includes(redirectUri)) {
          return NextResponse.json(
            { error: 'invalid_request', error_description: 'redirect_uri not whitelisted for this client' },
            { status: 400 }
          );
        }
        if (!(client as any).is_active) {
          return NextResponse.json(
            { error: 'invalid_client', error_description: 'Client is not active' },
            { status: 401 }
          );
        }
      } catch (error) {
        console.error('[SSO Authorize] Client validation error:', error);
        return NextResponse.json(
          { error: 'server_error', error_description: 'Failed to validate client' },
          { status: 500 }
        );
      }
    }

    try {
      await createAuthRequest(db, {
        id: generateUUID(),
        state,
        nonce: nonce || '',
        pkceVerifier: generateRandomString(128),
        provider: 'sso',
        clientId,
        redirectUri,
        scopes: scope,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
    } catch (error) {
      console.error('[SSO Authorize] Failed to store auth request:', error);
      return NextResponse.json(
        { error: 'server_error', error_description: 'Failed to process authorization request' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      message: 'Authorization request received',
      clientId,
      redirectUri,
      scopes: scope.split(' '),
      state,
    });

    response.cookies.set('oauth_sso_state', JSON.stringify({ clientId, redirectUri, scope, state, nonce }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[OAuth Authorize] Error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to process authorization request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json();
    const { clientId, redirectUri, state, approved } = body;

    if (!clientId || !redirectUri || !state || approved === undefined) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user is authenticated via access_token cookie or Authorization header
    const cookieToken = request.cookies.get('access_token')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    const accessToken = cookieToken || headerToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'User must be authenticated to authorize' },
        { status: 401 }
      );
    }

    const jwtPayload = await verifyJWT(accessToken);
    if (!jwtPayload || jwtPayload.type !== 'access') {
      return NextResponse.json(
        { error: 'unauthorized', error_description: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    let redirectUrl: URL;
    try {
      redirectUrl = new URL(redirectUri);
      if (redirectUrl.protocol !== 'https:' && redirectUrl.protocol !== 'http:') {
        throw new Error('Must use HTTP or HTTPS');
      }
    } catch {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Invalid redirect_uri' },
        { status: 400 }
      );
    }

    if (!approved) {
      redirectUrl.searchParams.append('error', 'access_denied');
      redirectUrl.searchParams.append('error_description', 'User denied access');
      redirectUrl.searchParams.append('state', state);
      return NextResponse.json({ redirect_uri: redirectUrl.toString() });
    }

    const db = await getDatabase();
    const authRequest = await getAuthRequestByState(db, state);
    if (!authRequest) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Authorization request not found or expired' },
        { status: 400 }
      );
    }

    const authorizationCode = `code_${generateRandomString(32)}`;

    try {
      await db.prepare(
        'UPDATE auth_requests SET code = ?, user_id = ? WHERE state = ?'
      ).bind(authorizationCode, jwtPayload.sub, state).run();
    } catch (dbError) {
      console.error('[SSO Authorize POST] Failed to update auth request:', dbError);
      return NextResponse.json(
        { error: 'server_error', error_description: 'Failed to store authorization code' },
        { status: 500 }
      );
    }

    redirectUrl.searchParams.append('code', authorizationCode);
    redirectUrl.searchParams.append('state', state);

    return NextResponse.json({
      redirect_uri: redirectUrl.toString(),
      code: authorizationCode,
    });

  } catch (error) {
    console.error('[OAuth Authorize POST] Error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to generate authorization code' },
      { status: 500 }
    );
  }
}
