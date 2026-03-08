export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { generateRandomString, hashString } from '@/lib/webcrypto';
import { createOAuthClient, getOAuthClientById, getUserById } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';
import { verifyJWT } from '@/lib/jwt';
import { sendAppRegisteredEmail } from '@/lib/email';

async function getAuth(request: NextRequest) {
  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const payload = await verifyJWT(token);
  if (!payload || payload.type !== 'access') return null;
  return payload;
}

/**
 * POST /api/auth/oauth-clients
 * 
 * Register a new OAuth 2.0 application
 * Third-party services use this endpoint to register for sign in/sign up
 * 
 * Returns: { client_id, client_secret }
 * 
 * IMPORTANT: Store client_secret securely. It will NOT be retrievable after first creation.
 * 
 * Request body:
 * {
 *   "name": "My Service Name",
 *   "redirect_uris": ["https://myservice.com/auth/callback"],
 *   "logo_uri": "https://myservice.com/logo.png", (optional)
 *   "description": "Brief description of your service", (optional)
 *   "scopes": ["openid", "profile", "email"]
 * }
 * 
 * Response:
 * {
 *   "client_id": "cli_xxxxx",
 *   "client_secret": "secret_xxxxx",
 *   "name": "My Service Name",
 *   "redirect_uris": ["https://myservice.com/auth/callback"],
 *   "scopes": ["openid", "profile", "email"],
 *   "created_at": "2026-02-21T10:00:00Z"
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Enforce email verification
    const db = await getDatabase();
    const user = await getUserById(db, auth.sub) as any;
    if (user && !user.email_verified) {
      return NextResponse.json(
        { error: 'Please verify your email address before registering an OAuth application.' },
        { status: 403 }
      );
    }

    const body: any = await request.json();
    const { name, redirect_uris, logo_uri, description, homepage_url, scopes } = body;

    // Validate required fields
    if (!name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return NextResponse.json(
        { error: 'name and redirect_uris (non-empty array) are required' },
        { status: 400 }
      );
    }

    if (redirect_uris.length > 5) {
      return NextResponse.json(
        { error: 'Maximum of 5 redirect URIs allowed' },
        { status: 400 }
      );
    }

    // Validate redirect URIs are valid URLs (HTTP and HTTPS allowed)
    const validUris: string[] = [];
    for (const uri of redirect_uris) {
      try {
        const parsed = new URL(uri);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return NextResponse.json(
            { error: `Redirect URI must use HTTP or HTTPS: ${uri}` },
            { status: 400 }
          );
        }
        validUris.push(uri);
      } catch {
        return NextResponse.json(
          { error: `Invalid redirect_uri: ${uri}` },
          { status: 400 }
        );
      }
    }

    // Validate scopes if provided
    const validScopes = ['openid', 'profile', 'email', 'phone', 'address'];
    if (scopes && Array.isArray(scopes)) {
      for (const scope of scopes) {
        if (!validScopes.includes(scope)) {
          return NextResponse.json(
            { error: `Invalid scope: ${scope}. Valid scopes: ${validScopes.join(', ')}` },
            { status: 400 }
          );
        }
      }
    }

    // Generate secure credentials
    const clientId = `cli_${generateRandomString(32)}`;
    const clientSecret = `secret_${generateRandomString(64)}`;
    const clientSecretHash = await hashString(clientSecret);

    const now = new Date().toISOString();

    // Store in D1
    try {
      await createOAuthClient(db, {
        clientId,
        clientSecretHash,
        name,
        redirectUris: JSON.stringify(validUris),
        scopes: JSON.stringify(scopes || validScopes),
        ownerId: auth.sub,
        description,
        homepageUrl: homepage_url,
      });
      console.log(`[OAuth Client] Registered: ${name} (${clientId})`);

      // Notify owner via email (fire-and-forget)
      try {
        const owner = await getUserById(db, auth.sub) as any;
        if (owner?.email) {
          const ownerName = owner.display_name || owner.email.split('@')[0];
          await sendAppRegisteredEmail(owner.email, ownerName, name, clientId);
        }
      } catch (emailError) {
        console.error('[OAuth Client] Failed to send registration email:', emailError);
      }
    } catch (dbError) {
      console.error('[OAuth Client] Database storage error:', dbError);
      return NextResponse.json(
        { error: 'Failed to register application' },
        { status: 500 }
      );
    }

    // Return credentials (client_secret shown only once)
    return NextResponse.json(
      {
        client_id: clientId,
        client_secret: clientSecret,
        name,
        redirect_uris: validUris,
        homepage_url,
        logo_uri,
        description,
        scopes: scopes || validScopes,
        created_at: now,
        _notice: 'Store client_secret securely. It will NOT be retrievable after this response.',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('[OAuth Client] Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register application' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/oauth-clients?client_id=cli_xxx
 * 
 * Get application details (public info only, no secret)
 * This is used by the authorization server to validate client credentials
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      );
    }

    // Fetch from D1
    const db = await getDatabase();
    const client = await getOAuthClientById(db, clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Return public client info (no secret!)
    return NextResponse.json({
      client_id: clientId,
      name: (client as any).name,
      redirect_uris: JSON.parse((client as any).redirect_uris || '[]'),
      scopes: JSON.parse((client as any).scopes || '[]'),
      created_at: (client as any).created_at,
      is_active: (client as any).is_active,
    });

  } catch (error) {
    console.error('[OAuth Client] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to get client details' },
      { status: 500 }
    );
  }
}
