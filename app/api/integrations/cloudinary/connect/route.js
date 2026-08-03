export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';
import { buildCloudinaryAuthorizationUrl } from '../../../../../lib/cloudinaryOAuth';

export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.redirect(new URL('/sign-in?next=/settings?tab=integrations', request.url));
  }

  try {
    const state = crypto.randomUUID();
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;
    const requestedNext = requestUrl.searchParams.get('next') || '';
    const safeNext = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/settings?tab=integrations';
    const response = NextResponse.redirect(buildCloudinaryAuthorizationUrl({ origin, state }));
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    };
    response.cookies.set('cloudinary_oauth_state', state, cookieOptions);
    response.cookies.set('cloudinary_oauth_next', safeNext, cookieOptions);
    return response;
  } catch (error) {
    console.error('[cloudinary/oauth] Could not start authorization:', error?.message || error);
    return NextResponse.redirect(new URL('/settings?tab=integrations&cloudinary=config_error', request.url));
  }
}
