import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login|images).*)'],
};

export async function middleware(request: NextRequest) {
  // Allow the landing page to be publicly accessible
  if (request.nextUrl.pathname === '/') {
    return NextResponse.next();
  }

  // --- DEV MODE BYPASS ---
  // When DEV_SKIP_AUTH is set, skip all auth checks so the app is
  // usable locally without needing real Elixpo SSO credentials.
  if (process.env.DEV_SKIP_AUTH === 'true') {
    const response = NextResponse.next();
    response.headers.set('x-user-id', 'dev-user-local');
    return response;
  }

  const sessionId = request.cookies.get('elixpo_session')?.value;

  if (!sessionId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // In production (Cloudflare Workers), the KV binding and JWT_SECRET
  // come from the environment. For edge middleware we validate the JWT
  // inline using jose.
  try {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(sessionId, secret);
    const userId = (payload as any).sessionId;

    if (!userId) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const response = NextResponse.next();
    response.headers.set('x-user-id', userId);
    return response;
  } catch {
    // JWT invalid or expired — redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
