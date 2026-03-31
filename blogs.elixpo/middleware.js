import { NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/settings', '/new-blog'];

// All known app route prefixes — anything NOT in this set gets treated as a profile/blog handle
const APP_ROUTES = new Set([
  'about', 'api', 'callback', 'feed', 'handle', 'intro', 'library',
  'login', 'new-blog', 'profile', 'pricing', 'register', 'settings',
  'sign-in', 'sign-up', 'stats', 'stories', 'org',
  '_next', 'favicon.ico', 'logo.png', 'base-logo.png',
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
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/).*)'],
};
