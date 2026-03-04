import { NextRequest, NextResponse } from 'next/server';
import { hashString, generateUUID } from '@/lib/crypto';
import { verifyJWT, createAccessToken, createRefreshToken } from '@/lib/jwt';
import { getOAuthClientByIdWithSecret, validateOAuthClient, getRefreshTokenByHash, revokeRefreshToken, createRefreshToken as storeRefreshToken, getUserById } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grant_type, code, client_id, client_secret, redirect_uri, refresh_token, scope } = body;

    if (!grant_type) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'grant_type is required' },
        { status: 400 }
      );
    }

    // Authorization Code Flow (RFC 6749 Section 4.1)
    if (grant_type === 'authorization_code') {
      if (!code || !client_id || !client_secret || !redirect_uri) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'Missing required parameters: code, client_id, client_secret, redirect_uri' },
          { status: 400 }
        );
      }

      const db = await getDatabase();

      try {
        // 1. Fetch OAuth client and verify secret
        const client = await getOAuthClientByIdWithSecret(db, client_id);
        if (!client) {
          return NextResponse.json(
            { error: 'invalid_client', error_description: 'Client not found' },
            { status: 401 }
          );
        }

        // 2. Verify client_secret
        const clientSecretHash = hashString(client_secret);
        const isValidSecret = await validateOAuthClient(db, client_id, clientSecretHash);
        if (!isValidSecret) {
          return NextResponse.json(
            { error: 'invalid_client', error_description: 'Invalid client credentials' },
            { status: 401 }
          );
        }

        // 3. Verify redirect_uri matches
        const redirectUris = JSON.parse((client as any).redirect_uris || '[]');
        if (!redirectUris.includes(redirect_uri)) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'redirect_uri does not match' },
            { status: 400 }
          );
        }

        // 4. Look up auth request by code, get the user_id stored during authorization
        const authRequest = await db.prepare(
          'SELECT * FROM auth_requests WHERE code = ? AND client_id = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP'
        ).bind(code, client_id).first() as any;

        if (!authRequest) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Authorization code not found, expired, or already used' },
            { status: 400 }
          );
        }

        // Validate redirect_uri matches what was stored
        if (authRequest.redirect_uri !== redirect_uri) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'redirect_uri mismatch with authorization request' },
            { status: 400 }
          );
        }

        // 5. Mark code as used (single-use)
        await db.prepare('UPDATE auth_requests SET used = 1 WHERE code = ?').bind(code).run();

        // 6. Get the actual user from DB
        const userId = authRequest.user_id;
        if (!userId) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'No user associated with this authorization code' },
            { status: 400 }
          );
        }

        const user = await getUserById(db, userId) as any;
        if (!user) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'User not found' },
            { status: 400 }
          );
        }

        const scopes = (scope || authRequest.scopes || 'openid profile email').split(' ');

        const accessToken = await createAccessToken(
          userId,
          user.email,
          'email',
          parseInt(process.env.JWT_EXPIRATION_MINUTES || '15'),
          !!(user.is_admin)
        );
        const refreshTokenJWT = await createRefreshToken(userId, 'email');

        // Store refresh token
        const refreshTokenHash = hashString(refreshTokenJWT);
        await storeRefreshToken(db, {
          id: generateUUID(),
          userId,
          tokenHash: refreshTokenHash,
          clientId: client_id,
          expiresAt: new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '30') * 24 * 60 * 60 * 1000),
        });

        return NextResponse.json(
          {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: parseInt(process.env.JWT_EXPIRATION_MINUTES || '15') * 60,
            refresh_token: refreshTokenJWT,
            scope: scopes.join(' '),
          },
          { status: 200 }
        );
      } catch (error) {
        console.error('[Token] Authorization code flow error:', error);
        return NextResponse.json(
          { error: 'server_error', error_description: 'Failed to process token request' },
          { status: 500 }
        );
      }
    }

    // Refresh Token Flow (RFC 6749 Section 6)
    if (grant_type === 'refresh_token') {
      if (!refresh_token || !client_id) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'Missing required parameters: refresh_token, client_id' },
          { status: 400 }
        );
      }

      const db = await getDatabase();

      try {
        const payload = await verifyJWT(refresh_token);
        if (!payload || payload.type !== 'refresh') {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Invalid or expired refresh token' },
            { status: 400 }
          );
        }

        const refreshTokenHash = hashString(refresh_token);
        const tokenRecord = await getRefreshTokenByHash(db, refreshTokenHash);
        if (!tokenRecord) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: 'Refresh token not found or revoked' },
            { status: 400 }
          );
        }

        if ((tokenRecord as any).client_id && (tokenRecord as any).client_id !== client_id) {
          return NextResponse.json(
            { error: 'invalid_client', error_description: 'Client ID does not match token' },
            { status: 401 }
          );
        }

        // Get fresh user data
        const user = await getUserById(db, payload.sub) as any;
        const isAdmin = user ? !!(user.is_admin) : false;
        const email = user ? user.email : payload.email;

        const newAccessToken = await createAccessToken(
          payload.sub,
          email,
          payload.provider,
          parseInt(process.env.JWT_EXPIRATION_MINUTES || '15'),
          isAdmin
        );

        const newRefreshToken = await createRefreshToken(payload.sub, payload.provider);
        const newRefreshTokenHash = hashString(newRefreshToken);

        try {
          await revokeRefreshToken(db, refreshTokenHash);
          await storeRefreshToken(db, {
            id: generateUUID(),
            userId: payload.sub,
            tokenHash: newRefreshTokenHash,
            clientId: client_id,
            expiresAt: new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '30') * 24 * 60 * 60 * 1000),
          });
        } catch (storageError) {
          console.error('[Token] Token rotation error:', storageError);
        }

        return NextResponse.json(
          {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            token_type: 'Bearer',
            expires_in: parseInt(process.env.JWT_EXPIRATION_MINUTES || '15') * 60,
          },
          { status: 200 }
        );
      } catch (error) {
        console.error('[Token] Refresh token flow error:', error);
        return NextResponse.json(
          { error: 'server_error', error_description: 'Failed to refresh token' },
          { status: 500 }
        );
      }
    }

    // Client Credentials Flow - not yet implemented
    if (grant_type === 'client_credentials') {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'client_credentials not yet implemented' },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'unsupported_grant_type', error_description: `grant_type '${grant_type}' is not supported` },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Token Endpoint] Error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to process token request' },
      { status: 500 }
    );
  }
}
