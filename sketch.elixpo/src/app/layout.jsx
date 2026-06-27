import './globals.css'
import 'highlight.js/styles/github-dark-dimmed.css'
import InitHljs from '@/components/InitHljs'
const SITE_URL = 'https://sketch.elixpo.com'
const SITE_NAME = 'Elixpo Sketch'
const SITE_TAGLINE = 'Open Source Infinite Canvas, Hand Drawn Aesthetics, Built In Docs Editor'
const SITE_DESCRIPTION =
  'LixSketch is a free, open-source collaborative whiteboard for technical diagrams, wireframes, flowcharts, architecture drawings, and presentations. No login required — start drawing instantly as a guest. Features AI-powered smart editing (Beta), end-to-end encrypted sharing, real-time collaboration with live cursors, a Notion-style docs editor, LixScript DSL for scripted diagrams, 250K+ icons, and a VS Code extension. Runs entirely in the browser. Forever free.'
export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: `${SITE_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,

  applicationName: SITE_NAME,
  authors: [{ name: 'Elixpo', url: 'https://elixpo.com' }],
  creator: 'Elixpo',
  publisher: 'Elixpo',
  generator: 'Next.js',

  keywords: [
    'Elixpo Sketch',
    'Elixpo',
    'open source whiteboard',
    'infinite canvas',
    'sketching tool',
    'wireframing tool',
    'diagram tool',
    'eraser.io alternative',
    'excalidraw alternative',
    'tldraw alternative',
    'hand drawn diagrams',
    'roughjs',
    'perfect freehand',
    'real time collaboration',
    'end to end encrypted whiteboard',
    'block editor',
    'WYSIWYG docs editor',
    'LixScript',
    'mermaid diagrams',
    'graph plotting',
    'SVG canvas',
    'architecture diagrams',
    'flowcharts',
    'sequence diagrams',
    'developer tools',
    'product design',
    'system design',
    'free whiteboard',
    'no login whiteboard',
    'collaborative canvas',
    'AI diagram tool',
    'VS Code whiteboard extension',
    'LixSketch',
    'technical presentation tool',
    'online diagramming',
  ],

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/favicon-192x192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon.png', type: 'image/png', sizes: '1024x1024' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    other: [
      { rel: 'mask-icon', url: '/icon.svg', color: '#5B57D1' },
    ],
  },
  manifest: '/site.webmanifest',

  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    images: [
      {
        url: '/Images/og-image.png',
        width: 1322,
        height: 612,
        alt: 'Elixpo Sketch, hand drawn infinite canvas with real time collaboration and built in docs editor',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ['/Images/og-image.png'],
    creator: '@elixpo',
    site: '@elixpo',
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

  category: 'technology',
}

export const viewport = {
  themeColor: '#13171C',
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'Elixpo',
    url: 'https://elixpo.com',
  },
  image: `${SITE_URL}/Images/og-image.png`,
  screenshot: `${SITE_URL}/Images/og-image.png`,
  featureList: [
    'Infinite canvas with hand-drawn aesthetics',
    'Real-time collaboration with live cursors',
    'E2E encryption for shared canvases',
    'LixScript diagram DSL',
    'Notion-like docs editor',
    'Icon library with 250K+ icons',
    'PNG and SVG export',
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="/boxicons/css/boxicons.min.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <InitHljs />
        {children}
      </body>
    </html>
  )
}
