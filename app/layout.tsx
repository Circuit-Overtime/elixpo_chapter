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

const siteUrl = 'https://url.elixpo.com';
const title = 'ElixpoURL: Fast URL Shortener on the Edge';
const description =
  "Shorten URLs at the speed of light. Lightning-fast redirects, powerful analytics, and a developer-first API, all running on Cloudflare's edge network.";

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
