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
const TITLE = 'OreoLook — Your Curious AI Search Scout';
const DESCRIPTION =
  'Open-source multi-agent research system with skill-backed routing, grounded search, OpenAI-compatible APIs, buffered streaming, and Redis plus Qdrant memory. Built with Pollinations AI.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s | OreoLook',
  },
  description: DESCRIPTION,
  keywords: [
    'OreoLook',
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
    'multi-agent system',
    'OpenAI Responses API',
    'Qdrant memory',
    'Redis conversation state',
  ],
  authors: [
    { name: 'Ayushman Bhattacharya', url: 'https://github.com/elixpo' },
    { name: 'Nihal Gazi', url: 'mailto:info@nihalgazi.com' },
  ],
  creator: 'Ayushman Bhattacharya and Nihal Gazi',
  publisher: 'Elixpo',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'OreoLook',
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OreoLook — Search, synthesize, understand.',
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
