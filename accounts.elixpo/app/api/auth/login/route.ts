import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/password';
import { createAccessToken, createRefreshToken } from '@/lib/jwt';
import { hashString, generateUUID } from '@/lib/crypto';
import { createLoginRateLimiter } from '@/lib/rate-limit';
import { getUserByEmail, getUserByEmailWithPassword, getIdentitiesByUserId, createRefreshToken as storeRefreshToken, logAuditEvent, updateUserLastLogin } from '@/lib/db';
import { getDatabase } from '@/lib/d1-client';

/**
 * POST /api/auth/login
 *
 * Login user with email/password or OAuth provider
 *
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "userpassword", // required for email provider
 *   "provider": "google|github|email",
 *   "oauth_code": "authorization_code" // for OAuth
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, provider, oauth_code } = body;

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const db = await getDatabase();

    // Rate limiting: 10 login attempts per IP per minute
    try {
      const rateLimiter = createLoginRateLimiter();
      const rateLimit = await rateLimiter.check(db, ipAddress, 'login');
      if (!rateLimit.allowed) {
        console.warn(`[Login] Rate limit exceeded for IP: ${ipAddress}. Retry after ${rateLimit.retryAfter}s`);
        await logAuditEvent(db, {
          id: generateUUID(),
          eventType: 'login_attempt',
          ipAddress,
          userAgent,
          status: 'failure',
          errorMessage: 'Rate limited',
        });
        return NextResponse.json(
          {
            error: 'Too many login attempts. Please try again later.',
            retryAfter: rateLimit.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': (rateLimit.retryAfter || 900).toString(),
            },
          }
        );
      }
    } catch (rateLimitError) {
      console.error('[Login] Rate limit check error:', rateLimitError);
    }

    if (!email || !provider) {
      return NextResponse.json(
        { error: 'email and provider are required' },
        { status: 400 }
      );
    }

    let user: any;

    if (provider === 'email') {
      if (!password) {
        return NextResponse.json(
          { error: 'password is required for email provider' },
          { status: 400 }
        );
      }

      // Fetch user with password hash
      try {
        const dbUser = await getUserByEmailWithPassword(db, email);
        if (!dbUser) {
          await logAuditEvent(db, {
            id: generateUUID(),
            eventType: 'login_attempt',
            ipAddress,
            userAgent,
            status: 'failure',
            errorMessage: 'User not found',
          });
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }

        // Verify password
        const passwordHash = (dbUser as any).password_hash;
        if (!passwordHash) {
          return NextResponse.json(
            { error: 'This account does not have a password. Please use OAuth login.' },
            { status: 401 }
          );
        }

        const isValid = await verifyPassword(password, passwordHash);
        if (!isValid) {
          await logAuditEvent(db, {
            id: generateUUID(),
            userId: (dbUser as any).id,
            eventType: 'login_attempt',
            provider: 'email',
            ipAddress,
            userAgent,
            status: 'failure',
            errorMessage: 'Invalid password',
          });
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }

        user = dbUser;
      } catch (dbError) {
        console.error('[Login] Database error:', dbError);
        return NextResponse.json(
          { error: 'Login failed due to server error' },
          { status: 500 }
        );
      }
    } else if (provider === 'google' || provider === 'github') {
      if (!oauth_code) {
        return NextResponse.json(
          { error: `oauth_code is required for ${provider} provider` },
          { status: 400 }
        );
      }

      // Check provider lock-in
      try {
        const existingUser = await getUserByEmail(db, email);
        if (existingUser) {
          const identitiesResult = await getIdentitiesByUserId(db, (existingUser as any).id);
          const identities: any[] = (identitiesResult as any)?.results || [];
          const registeredProviders = identities.map((id: any) => id.provider);

          if (registeredProviders.length > 0 && !registeredProviders.includes(provider)) {
            const providerList = registeredProviders.join(', ');
            return NextResponse.json(
              {
                error: `This account was registered with ${providerList}. Please login with ${registeredProviders.length === 1 ? 'that' : 'one of those'} provider.`,
                registeredProviders,
              },
              { status: 403 }
            );
          }
          user = existingUser;
        }
      } catch (error) {
        console.error('[Login] Provider lock-in check error:', error);
      }

      if (!user) {
        user = { id: generateUUID(), email };
      }
    } else {
      return NextResponse.json(
        { error: `unsupported provider: ${provider}` },
        { status: 400 }
      );
    }

    // Get full user for isAdmin flag
    const isAdminUser = !!(user.is_admin);

    // Create tokens (include isAdmin in access token)
    const accessToken = await createAccessToken(
      user.id,
      email,
      provider as any,
      parseInt(process.env.JWT_EXPIRATION_MINUTES || '15'),
      isAdminUser
    );
    const refreshTokenJWT = await createRefreshToken(user.id, provider as any);

    // Store refresh token and log success
    try {
      const refreshTokenHash = hashString(refreshTokenJWT);
      await storeRefreshToken(db, {
        id: generateUUID(),
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '30') * 24 * 60 * 60 * 1000),
      });

      await updateUserLastLogin(db, user.id);

      await logAuditEvent(db, {
        id: generateUUID(),
        userId: user.id,
        eventType: 'login_success',
        provider,
        ipAddress,
        userAgent,
        status: 'success',
      });
    } catch (dbError) {
      console.error('[Login] Database storage error:', dbError);
    }

    const maxAge = parseInt(process.env.JWT_EXPIRATION_MINUTES || '15') * 60;

    const response = NextResponse.json({
      user: {
        id: user.id,
        email,
        provider,
        isAdmin: isAdminUser,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshTokenJWT,
        expires_in: maxAge,
        token_type: 'Bearer',
      },
    });

    // Set secure httpOnly cookies
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    response.cookies.set('refresh_token', refreshTokenJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '30') * 24 * 60 * 60,
      path: '/',
    });

    // Non-httpOnly cookie for client-side auth checks
    response.cookies.set('user_id', user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
