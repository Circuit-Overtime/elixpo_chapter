import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://url.elixpo.com';
const title = 'ElixpoURL - Fast URL Shortener on the Edge';
const description =
  'Shorten URLs at the speed of light. Lightning-fast redirects, powerful analytics, and a developer-first API — all running on Cloudflare\'s edge network.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s | ElixpoURL',
  },
  description,
  keywords: [
    'url shortener',
    'link shortener',
    'short links',
    'elixpo',
    'edge network',
    'cloudflare',
    'analytics',
    'api',
    'developer tools',
  ],
  authors: [{ name: 'Elixpo', url: 'https://elixpo.com' }],
  creator: 'Elixpo',
  publisher: 'Elixpo',
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
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
        width: 1200,
        height: 630,
        alt: 'ElixpoURL — Fast URL Shortener on the Edge',
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
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="font-body antialiased overflow-x-hidden">{children}</body>
    </html>
  );
}
