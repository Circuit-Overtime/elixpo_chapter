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
    const origin = new URL(request.url).origin;
    const response = NextResponse.redirect(buildCloudinaryAuthorizationUrl({ origin, state }));
    response.cookies.set('cloudinary_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('[cloudinary/oauth] Could not start authorization:', error?.message || error);
    return NextResponse.redirect(new URL('/settings?tab=integrations&cloudinary=config_error', request.url));
  }
}
