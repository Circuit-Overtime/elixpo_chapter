import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteUrl = 'https://lixrl.com';
const title = 'ElixpoURL: Fast URL Shortener on the Edge';
const description =
  "Shorten URLs at the speed of light. Lightning-fast redirects, powerful analytics, and a developer-first API, all running on Cloudflare's edge network.";

// Google Search Console — "HTML tag" verification method. Set
// NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION (the `content` value Google gives you)
// in .env.local and rebuild. Empty → no tag emitted. The DNS-TXT method is an
// alternative that needs no code change at all.
const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s | ElixpoURL',
  },
  description,
  applicationName: 'ElixpoURL',
  alternates: {
    canonical: '/',
  },
  keywords: [
    'url shortener',
    'link shortener',
    'short links',
    'elixpo',
    'elixpourl',
    'edge network',
    'cloudflare workers',
    'cloudflare d1',
    'link analytics',
    'short url api',
    'developer tools',
    'open source',
  ],
  authors: [{ name: 'Elixpo', url: 'https://elixpo.com' }],
  creator: 'Elixpo',
  publisher: 'Elixpo',
  category: 'developer tools',
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'ElixpoURL',
    title,
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1822,
        height: 825,
        alt: 'ElixpoURL: Fast URL Shortener on the Edge',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og-image.png'],
    creator: '@elixpo',
    site: '@elixpo',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Icons declared explicitly so they're emitted as <link> tags pointing
  // at static files in public/. Putting these files under app/ (the
  // Next.js icon convention) would compile them into route handlers,
  // which Cloudflare Pages can't run because they default to the Node
  // runtime — the same break that hit accounts.elixpo earlier.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon0.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon1.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body className="antialiased overflow-x-hidden font-sans">{children}</body>
    </html>
  );
}
