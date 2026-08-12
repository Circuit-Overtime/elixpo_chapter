import type { Metadata } from 'next';
import { DM_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import './theme.css';

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
const TITLE = 'OreoLook — Search the web. Get the answer. Keep the receipts.';
const DESCRIPTION =
  'OreoLook is an open-source AI answer engine that searches live sources, reads what matters, and streams grounded answers with citations through an OpenAI-compatible API.';

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
    'answer engine',
    'AI research assistant',
    'real-time web research',
    'Perplexity alternative',
    'search with sources',
  ],
  authors: [
    { name: 'Ayushman Bhattacharya', url: 'https://github.com/elixpo' },
    { name: 'Nihal Gazi', url: 'mailto:info@nihalgazi.com' },
  ],
  creator: 'Ayushman Bhattacharya and Nihal Gazi',
  publisher: 'Elixpo',
  applicationName: 'OreoLook',
  category: 'technology',
  icons: {
    icon: '/search.elixpo.png',
    apple: '/search.elixpo.png',
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
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body className="font-body">
        {children}
      </body>
    </html>
  );
}
