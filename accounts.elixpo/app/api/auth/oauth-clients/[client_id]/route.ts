export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';
import { getOAuthClientById, getOAuthClientByIdWithSecret, updateOAuthClient, getUserById } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';
import { generateRandomString, hashString } from '@/lib/webcrypto';
import { sendAppDeletedEmail } from '@/lib/email';

/**
 * PUT /api/auth/oauth-clients/[client_id]
 * UPDATE /api/auth/oauth-clients/[client_id]
 *
 * Update OAuth application details
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { client_id } = await params;
    const body: any = await request.json();
    const { name, redirect_uris, scopes, description, homepage_url, logo_url } = body;

    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Verify ownership
    const app = await getOAuthClientByIdWithSecret(db, client_id) as any;
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (app.owner_id !== payload.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate redirect URIs if provided
    if (redirect_uris !== undefined) {
      if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        return NextResponse.json({ error: 'redirect_uris must be a non-empty array' }, { status: 400 });
      }
      if (redirect_uris.length > 5) {
        return NextResponse.json({ error: 'Maximum of 5 redirect URIs allowed' }, { status: 400 });
      }
      for (const uri of redirect_uris) {
        try {
          const parsed = new URL(uri);
          if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return NextResponse.json({ error: `Redirect URI must use HTTP or HTTPS: ${uri}` }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: `Invalid redirect_uri: ${uri}` }, { status: 400 });
        }
      }
    }

    try {
      await updateOAuthClient(db, client_id, {
        ...(name !== undefined && { name }),
        ...(redirect_uris !== undefined && { redirectUris: JSON.stringify(redirect_uris) }),
        ...(scopes !== undefined && { scopes: JSON.stringify(scopes) }),
        ...(description !== undefined && { description }),
        ...(homepage_url !== undefined && { homepageUrl: homepage_url }),
        ...(logo_url !== undefined && { logoUrl: logo_url }),
      });
    } catch (error) {
      console.error('[OAuth Client] Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      );
    }

    const updated = await getOAuthClientById(db, client_id) as any;
    return NextResponse.json({
      client_id,
      name: updated?.name,
      description: updated?.description,
      homepage_url: updated?.homepage_url,
      redirect_uris: JSON.parse(updated?.redirect_uris || '[]'),
      scopes: JSON.parse(updated?.scopes || '[]'),
      is_active: Boolean(updated?.is_active),
      request_count: updated?.request_count ?? 0,
      last_used: updated?.last_used,
    });
  } catch (error) {
    console.error('[OAuth Client] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/oauth-clients/[client_id]
 *
 * Regenerate the client secret for an OAuth application
 * Returns the new secret (shown only once)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { client_id } = await params;

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify ownership
    const app = await getOAuthClientByIdWithSecret(db, client_id) as any;
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (app.owner_id !== payload.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate new secret
    const newSecret = `secret_${generateRandomString(64)}`;
    const newSecretHash = await hashString(newSecret);

    await updateOAuthClient(db, client_id, { clientSecretHash: newSecretHash });

    console.log(`[OAuth Client] Secret regenerated for: ${client_id}`);

    return NextResponse.json({
      client_id,
      client_secret: newSecret,
      _notice: 'Store this secret securely. It will NOT be retrievable after this response.',
    });
  } catch (error) {
    console.error('[OAuth Client] Secret regeneration error:', error);
    return NextResponse.json({ error: 'Failed to regenerate secret' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/oauth-clients/[client_id]
 *
 * Deactivate an OAuth application
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { client_id } = await params;

    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Verify ownership
    const app = await getOAuthClientByIdWithSecret(db, client_id) as any;
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    if (app.owner_id !== payload.sub) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
      await updateOAuthClient(db, client_id, { isActive: false });
    } catch (error) {
      console.error('[OAuth Client] Database delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete application' },
        { status: 500 }
      );
    }

    console.log(`[OAuth Client] Deactivated: ${client_id}`);

    // Notify owner via email (fire-and-forget)
    try {
      const owner = await getUserById(db, payload.sub) as any;
      if (owner?.email) {
        const ownerName = owner.display_name || owner.email.split('@')[0];
        await sendAppDeletedEmail(owner.email, ownerName, app.name, client_id);
      }
    } catch (emailError) {
      console.error('[OAuth Client] Failed to send deactivation email:', emailError);
    }

    return NextResponse.json({
      message: 'Application deactivated successfully',
      client_id,
    });
  } catch (error) {
    console.error('[OAuth Client] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/oauth-clients/[client_id]
 *
 * Get OAuth application details (public info only)
 * Query params:
 *   - validate_redirect_uri: optional redirect URI to validate against registered URIs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ client_id: string }> }
) {
  try {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { client_id } = await params;
    const validateRedirectUri = request.nextUrl.searchParams.get('validate_redirect_uri');

    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id is required' },
        { status: 400 }
      );
    }

    // Get from D1
    let app: any = null;
    try {
      const db = await getDatabase();
      app = await getOAuthClientByIdWithSecret(db, client_id);
      if (!app) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
      if (!(app as any).is_active && (app as any).owner_id !== payload.sub) {
        return NextResponse.json({ error: 'Application is inactive' }, { status: 403 });
      }
    } catch (error) {
      console.error('[OAuth Client] Database get error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch application' },
        { status: 500 }
      );
    }

    const redirect_uris = JSON.parse((app as any).redirect_uris || '[]');
    const scopes = JSON.parse((app as any).scopes || '[]');

    // Validate redirect URI if provided
    if (validateRedirectUri) {
      if (!redirect_uris.includes(validateRedirectUri)) {
        return NextResponse.json(
          {
            error: 'Invalid redirect URI',
            message: `The provided redirect_uri is not registered for this application`,
            registeredUris: redirect_uris,
          },
          { status: 400 }
        );
      }
    }

    // Return full data (owner gets extra fields, others get public subset)
    const isOwner = (app as any).owner_id === payload.sub;
    return NextResponse.json({
      client_id,
      name: (app as any).name,
      redirect_uris,
      scopes,
      is_active: Boolean((app as any).is_active),
      created_at: (app as any).created_at,
      ...(isOwner && {
        description: (app as any).description,
        homepage_url: (app as any).homepage_url,
        logo_url: (app as any).logo_url,
        request_count: (app as any).request_count ?? 0,
        last_used: (app as any).last_used,
      }),
    });
  } catch (error) {
    console.error('[OAuth Client] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}
