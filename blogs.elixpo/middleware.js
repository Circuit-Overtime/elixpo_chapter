import { NextResponse } from 'next/server';

// Routes that require authentication — redirect to /sign-in if no session
const PROTECTED_PATHS = [
  '/settings',
  '/new-blog',
  '/intro',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect specific routes — everything else is public
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const session = request.cookies.get('lixblogs_session')?.value;
    if (!session) {
      const signInUrl = new URL('/sign-in', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/).*)'],
};
