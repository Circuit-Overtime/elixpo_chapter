import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import LandingPageClient from './LandingPageClient';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: { absolute: 'Lixrl — URL Shortener & Quick QR Code Generator' },
  description:
    'Shorten a URL in one click, generate a QR code for any link, and unlock branded links, custom QR styles, and analytics when you need them.',
  alternates: { canonical: '/' },
};

/**
 * Landing-page entry point.
 *
 * Server-side auth check before rendering the marketing surface — signed-in
 * users are sent straight to `/dashboard` so they don't have to click
 * through the hero. Anonymous visitors get the full landing page.
 *
 * `getCurrentUser()` is cheap (KV session lookup → D1 fallback) and runs
 * at the edge, so the redirect adds no perceptible latency.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }
  return <LandingPageClient />;
}
