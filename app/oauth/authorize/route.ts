export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getOAuthClientById, createAuthRequest } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';
import { generateUUID, generateRandomString } from '@/lib/webcrypto';

/**
 * GET /oauth/authorize
 *
 * Standard OAuth 2.0 Authorization Endpoint (RFC 6749 §4.1.1)
 *
 * External apps redirect their users here with:
 *   ?response_type=code
 *   &client_id=<registered_client_id>
 *   &redirect_uri=<whitelisted_uri>
 *   &state=<csrf_state>
 *   &scope=openid profile email   (optional)
 *
 * What this does:
 *   1. Validates the request parameters and the registered client
 *   2. If the user is not logged in → saves the request in a cookie and
 *      redirects them to /login?next=/oauth/authorize?... so they can
 *      authenticate first, then come back here
 *   3. If the user is logged in → stores the auth request in the DB and
 *      redirects to the /authorize consent screen
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const responseType = sp.get('response_type');
  const clientId = sp.get('client_id');
  const redirectUri = sp.get('redirect_uri');
  const state = sp.get('state');
  const scope = sp.get('scope') || 'openid profile email';
  const nonce = sp.get('nonce') || '';

  // --- 1. Validate required params ---
  if (!responseType || !clientId || !redirectUri || !state) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description:
          'Missing required parameters: response_type, client_id, redirect_uri, state',
      },
      { status: 400 }
    );
  }

  if (responseType !== 'code') {
    return NextResponse.json(
      {
        error: 'unsupported_response_type',
        error_description: 'Only response_type=code is supported',
      },
      { status: 400 }
    );
  }

  // Validate redirect_uri is a well-formed URL (HTTP and HTTPS allowed)
  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUri);
    if (parsedRedirect.protocol !== 'https:' && parsedRedirect.protocol !== 'http:') {
      throw new Error('HTTP or HTTPS required');
    }
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'redirect_uri must be a valid absolute URL using HTTP or HTTPS',
      },
      { status: 400 }
    );
  }

  // --- 2. Validate client ---
  try {
    const db = await getDatabase();
    const client = await getOAuthClientById(db, clientId) as any;

    if (!client) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Client not found' },
        { status: 401 }
      );
    }

    if (!client.is_active) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Client is not active' },
        { status: 401 }
      );
    }

    const allowedUris: string[] = JSON.parse(client.redirect_uris || '[]');
    if (!allowedUris.includes(redirectUri)) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          error_description: 'redirect_uri is not registered for this client',
        },
        { status: 400 }
      );
    }

    // --- 3. Check if user is authenticated ---
    const accessToken =
      request.cookies.get('access_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!accessToken) {
      // Not logged in — save the full authorize request in a cookie and
      // send them to login. After login they'll be bounced back here.
      const pendingParams = new URLSearchParams({
        response_type: responseType,
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope,
        ...(nonce ? { nonce } : {}),
      });

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set(
        'next',
        `/oauth/authorize?${pendingParams.toString()}`
      );

      return NextResponse.redirect(loginUrl);
    }

    // Verify the token is valid
    const payload = await verifyJWT(accessToken);
    if (!payload || payload.type !== 'access') {
      // Token present but invalid/expired — same as not logged in
      const pendingParams = new URLSearchParams({
        response_type: responseType,
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope,
        ...(nonce ? { nonce } : {}),
      });

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set(
        'next',
        `/oauth/authorize?${pendingParams.toString()}`
      );

      return NextResponse.redirect(loginUrl);
    }

    // --- 4. Store the auth request in DB ---
    await createAuthRequest(db, {
      id: generateUUID(),
      state,
      nonce,
      pkceVerifier: generateRandomString(128),
      provider: 'sso',
      clientId,
      redirectUri,
      scopes: scope,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // --- 5. Redirect to the consent screen ---
    const consentUrl = new URL('/authorize', request.url);
    consentUrl.searchParams.set('client_id', clientId);
    consentUrl.searchParams.set('redirect_uri', redirectUri);
    consentUrl.searchParams.set('state', state);
    consentUrl.searchParams.set('scope', scope);
    if (nonce) consentUrl.searchParams.set('nonce', nonce);

    return NextResponse.redirect(consentUrl);
  } catch (err) {
    console.error('[OAuth Authorize] Error:', err);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to process authorization request' },
      { status: 500 }
    );
  }
}
