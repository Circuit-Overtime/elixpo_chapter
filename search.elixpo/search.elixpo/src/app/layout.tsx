import type { Metadata } from 'next';
import { DM_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const SITE_URL = 'https://search.elixpo.com';
const TITLE = 'lixSearch — AI-Powered Search Engine';
const DESCRIPTION =
  'Open-source intelligent search assistant that searches the web, fetches content, and synthesizes answers with real sources and citations. Built with Pollinations AI.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s | lixSearch',
  },
  description: DESCRIPTION,
  keywords: [
    'lixSearch',
    'AI search engine',
    'semantic search',
    'RAG',
    'search assistant',
    'Pollinations AI',
    'open source search',
    'web search API',
    'deep search',
    'citation search',
  ],
  authors: [{ name: 'Ayushman Bhattacharya', url: 'https://github.com/elixpo' }],
  creator: 'Ayushman Bhattacharya',
  publisher: 'Elixpo',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'lixSearch',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'lixSearch — Search, synthesize, understand.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
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
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body bg-[#0a0c14] text-txt-primary">
        {children}
      </body>
    </html>
  );
}
