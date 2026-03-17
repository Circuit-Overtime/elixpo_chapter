import './globals.css'

const SITE_URL = 'https://sketch.elixpo.com'
const SITE_NAME = 'LixSketch'
const SITE_DESCRIPTION =
  'Open-source infinite canvas with hand-drawn aesthetics, real-time collaboration, docs editor, and LixScript diagram DSL. Free forever.'

export const metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,

  applicationName: SITE_NAME,
  authors: [{ name: 'Elixpo', url: 'https://elixpo.com' }],
  creator: 'Elixpo',
  publisher: 'Elixpo',
  generator: 'Next.js',

  keywords: [
    'LixSketch',
    'open source',
    'whiteboard',
    'infinite canvas',
    'diagram tool',
    'eraser.io alternative',
    'excalidraw alternative',
    'hand-drawn diagrams',
    'RoughJS',
    'real-time collaboration',
    'docs editor',
    'LixScript',
    'SVG canvas',
    'architecture diagrams',
    'wireframes',
    'flowcharts',
    'developer tools',
  ],

  icons: {
    icon: [
      { url: '/Images/logo.png', type: 'image/png', sizes: '128x128' },
    ],
    apple: '/Images/logo.png',
    shortcut: '/Images/logo.png',
  },

  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Open-Source Infinite Canvas & Diagram Tool`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
    images: [
      {
        url: '/Images/og-image.png',
        width: 1322,
        height: 612,
        alt: 'LixSketch — hand-drawn infinite canvas with real-time collaboration',
        type: 'image/png',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Open-Source Infinite Canvas`,
    description: SITE_DESCRIPTION,
    images: ['/Images/og-image.png'],
    creator: '@elixpo',
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
  themeColor: '#121212',
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
        <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark-dimmed.min.css" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
