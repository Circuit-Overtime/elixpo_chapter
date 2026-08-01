import { NextResponse } from 'next/server';

// All auth-gated routes hard-redirect to /sign-in?next=… (no in-page gate).
const PROTECTED_PATHS = ['/settings', '/new-blog', '/notifications', '/edit', '/intro', '/library', '/stats'];

// All known app route prefixes — anything NOT in this set gets treated as a profile/blog handle
const APP_ROUTES = new Set([
  'about', 'api', 'callback', 'edit', 'feed', 'handle', 'intro', 'library',
  'login', 'new-blog', 'notifications', 'profile', 'pricing', 'register', 'settings',
  'sign-in', 'sign-up', 'stats', 'stories', 'org',
  'help', 'docs', 'privacy', 'terms',
  '_next', 'favicon.ico', 'logo.png', 'logo-dark.png', 'logo-light.png', 'base-logo.png',
]);

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get the first path segment (e.g. /elixpo/slug → "elixpo")
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] || '';

  // Dynamic handle routes are now served by app/[...path]/page.jsx directly
  // (no middleware rewrite needed)

  // Auth protection
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected) {
    const session = request.cookies.get('lixblogs_session')?.value;
    if (!session) {
      const signIn = new URL('/sign-in', request.url);
      signIn.searchParams.set('next', pathname);
      return NextResponse.redirect(signIn);
    }
  }

  const response = NextResponse.next();
  // Reader/profile HTML references deployment-hashed Next chunks. Never cache
  // this document across releases or it can point at a chunk from an older
  // deployment and fail with a text/html MIME mismatch.
  if (firstSegment && !APP_ROUTES.has(firstSegment) && !firstSegment.startsWith('_')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/).*)'],
};
