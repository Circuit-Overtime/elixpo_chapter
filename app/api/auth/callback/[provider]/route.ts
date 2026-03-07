export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { generateUUID, hashString } from '@/lib/webcrypto';
import {
  createUser,
  createIdentity,
  createRefreshToken,
  logAuditEvent,
  updateUserLastLogin,
  getIdentityByProvider,
  getUserById,
  getUserByEmail,
  getIdentitiesByUserId,
} from '@/lib/db';
import { createAccessToken, createRefreshToken as createRefreshTokenJWT } from '@/lib/jwt';
import { getOAuthConfig } from '@/lib/oauth-config';
import { getDatabase } from '@/lib/d1-client';

/**
 * GET /api/auth/callback/[provider]?code=...&state=...
 * OAuth callback handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const ipAddress =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Handle OAuth provider errors (e.g. user denied access)
    if (error) {
      console.error(`OAuth error from ${provider}:`, error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || 'Authentication failed')}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/error?error=invalid_request&description=Missing+code+or+state+parameter',
          request.url
        )
      );
    }

    // Validate state cookie
    const storedState = request.cookies.get('oauth_state')?.value;
    const oauthMode = request.cookies.get('oauth_mode')?.value || 'login';

    if (!storedState || storedState !== state) {
      console.error('OAuth state mismatch:', { storedState, state });
      return NextResponse.redirect(
        new URL(
          '/error?error=invalid_state&description=State+validation+failed.+Please+try+again.',
          request.url
        )
      );
    }

    // Get OAuth config — derive origin from the request so it works in any environment
    const origin = new URL(request.url).origin;
    const config = getOAuthConfig(provider.toLowerCase(), {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    }, origin);

    if (!config) {
      return NextResponse.redirect(
        new URL(
          `/error?error=unsupported_provider&description=Provider+${provider}+is+not+supported`,
          request.url
        )
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForTokens(code, config);

    if (!tokenResponse?.access_token) {
      console.error('Failed to exchange code for tokens');
      return NextResponse.redirect(
        new URL(
          '/error?error=token_exchange_failed&description=Failed+to+exchange+authorization+code',
          request.url
        )
      );
    }

    // Fetch user info from provider
    const userInfo = await fetchUserInfoFromProvider(
      provider.toLowerCase(),
      tokenResponse.access_token,
      config.userInfoEndpoint
    );

    if (!userInfo?.sub) {
      console.error('Failed to fetch user info from provider');
      return NextResponse.redirect(
        new URL(
          '/error?error=user_info_failed&description=Failed+to+retrieve+user+information',
          request.url
        )
      );
    }

    const db = await getDatabase();
    const email = userInfo.email || `${provider}_${userInfo.sub}@elixpo.local`;

    // --- Core logic: check identity and cross-provider conflicts ---

    // 1. Check if this exact provider identity already exists
    const existingIdentity = await getIdentityByProvider(db, provider.toLowerCase(), userInfo.sub);

    if (existingIdentity) {
      // Identity exists — this is a returning user
      if (oauthMode === 'register') {
        // They're trying to register but already have an account — just log them in
        const existingUser = await getUserById(db, (existingIdentity as any).user_id);
        if (!existingUser) {
          return NextResponse.redirect(
            new URL(
              '/error?error=account_error&description=Account+data+is+inconsistent.+Please+contact+support.',
              request.url
            )
          );
        }
        return await buildSuccessResponse(request, db, existingUser, email, provider, ipAddress, userAgent);
      }

      // Login mode — identity found, log in
      const existingUser = await getUserById(db, (existingIdentity as any).user_id);
      if (!existingUser) {
        return NextResponse.redirect(
          new URL(
            '/error?error=account_error&description=Account+data+is+inconsistent.+Please+contact+support.',
            request.url
          )
        );
      }
      return await buildSuccessResponse(request, db, existingUser, email, provider, ipAddress, userAgent);
    }

    // 2. No identity found — check if email is taken by another provider
    const existingUserByEmail = await getUserByEmail(db, email);

    if (existingUserByEmail) {
      // Email exists — check what providers they registered with
      const identitiesResult = await getIdentitiesByUserId(db, (existingUserByEmail as any).id);
      const identities: any[] = (identitiesResult as any)?.results || [];
      const registeredProviders = identities.map((i: any) => i.provider).filter(Boolean);
      const providerList = registeredProviders.length > 0
        ? registeredProviders.join(', ')
        : 'a different method';

      // Block regardless of mode — they must use the provider they registered with
      return NextResponse.redirect(
        new URL(
          `/error?error=provider_conflict&description=${encodeURIComponent(
            `An account with this email already exists using ${providerList}. Please sign in with that provider instead.`
          )}`,
          request.url
        )
      );
    }

    // 3. No existing user at all
    if (oauthMode === 'login') {
      // Login attempted but no account exists — tell them to register first
      return NextResponse.redirect(
        new URL(
          `/error?error=account_not_found&description=${encodeURIComponent(
            'No account found with this email. Please register first.'
          )}`,
          request.url
        )
      );
    }

    // 4. Register mode + new user — create account
    const userId = generateUUID();

    try {
      await createUser(db, { id: userId, email });

      await createIdentity(db, {
        id: generateUUID(),
        userId,
        provider: provider.toLowerCase(),
        providerUserId: userInfo.sub,
        providerEmail: userInfo.email,
        providerProfileUrl: userInfo.picture,
      });

      await logAuditEvent(db, {
        id: generateUUID(),
        userId,
        eventType: 'registration',
        provider: provider.toLowerCase(),
        ipAddress,
        userAgent,
        status: 'success',
      });
    } catch (dbError) {
      console.error('Failed to create user/identity in DB:', dbError);
      return NextResponse.redirect(
        new URL(
          '/error?error=server_error&description=Failed+to+create+your+account.+Please+try+again.',
          request.url
        )
      );
    }

    const newUser = { id: userId, email, is_admin: 0 };
    return await buildSuccessResponse(request, db, newUser, email, provider, ipAddress, userAgent);

  } catch (err) {
    console.error(`OAuth callback error for ${provider}:`, err);
    return NextResponse.redirect(
      new URL(
        '/error?error=server_error&description=An+unexpected+error+occurred+during+authentication',
        request.url
      )
    );
  }
}

/**
 * Build a successful auth response: issue tokens, set cookies, redirect to dashboard.
 */
async function buildSuccessResponse(
  request: NextRequest,
  db: any,
  user: any,
  email: string,
  provider: string,
  ipAddress: string,
  userAgent: string
) {
  const accessToken = await createAccessToken(
    user.id,
    email,
    provider.toLowerCase() as 'google' | 'github',
    parseInt(process.env.JWT_EXPIRATION_MINUTES || '15'),
    !!user.is_admin
  );

  const refreshToken = await createRefreshTokenJWT(
    user.id,
    provider.toLowerCase() as 'google' | 'github'
  );

  try {
    const refreshTokenHash = await hashString(refreshToken);
    await createRefreshToken(db, {
      id: generateUUID(),
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(
        Date.now() +
          parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '30') * 24 * 60 * 60 * 1000
      ),
    });

    await updateUserLastLogin(db, user.id);

    await logAuditEvent(db, {
      id: generateUUID(),
      userId: user.id,
      eventType: 'login_success',
      provider: provider.toLowerCase(),
      ipAddress,
      userAgent,
      status: 'success',
    });
  } catch (dbError) {
    console.error('Failed to store tokens/audit log:', dbError);
  }

  const redirectDest = user.is_admin ? '/admin' : '/dashboard/oauth-apps';
  const response = NextResponse.redirect(new URL(redirectDest, request.url));

  const maxAge = parseInt(process.env.JWT_EXPIRATION_MINUTES || '15') * 60;
  const refreshMaxAge =
    parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '30') * 24 * 60 * 60;
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  });

  response.cookies.set('user_id', user.id, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge,
    path: '/',
  });

  // Clear OAuth state cookies
  response.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });
  response.cookies.set('oauth_mode', '', { maxAge: 0, path: '/' });

  return response;
}

/**
 * Exchange authorization code for provider tokens.
 */
async function exchangeCodeForTokens(
  code: string,
  config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tokenEndpoint: string;
  }
): Promise<{ access_token: string; refresh_token?: string; id_token?: string } | null> {
  try {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    };

    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      console.error('Token endpoint error:', response.status, await response.text());
      return null;
    }

    return await response.json() as any;
  } catch (err) {
    console.error('Token exchange error:', err);
    return null;
  }
}

/**
 * Fetch and normalize user info from the OAuth provider.
 */
async function fetchUserInfoFromProvider(
  provider: string,
  accessToken: string,
  endpoint: string
): Promise<{ sub: string; email?: string; name?: string; picture?: string } | null> {
  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error('User info endpoint error:', response.status);
      return null;
    }

    const data: any = await response.json();

    switch (provider) {
      case 'google':
        return { sub: data.sub, email: data.email, name: data.name, picture: data.picture };

      case 'github': {
        // GitHub may not return email in the user endpoint — handle null
        const githubEmail = data.email || null;
        return {
          sub: String(data.id),
          email: githubEmail,
          name: data.name,
          picture: data.avatar_url,
        };
      }

      default:
        return null;
    }
  } catch (err) {
    console.error('Fetch user info error:', err);
    return null;
  }
}
