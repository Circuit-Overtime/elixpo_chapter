import './globals.css';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';

const SITE_URL = 'https://blogs.elixpo.com';
const SITE_NAME = 'LixBlogs';
const SITE_DESC = 'A modern blogging platform with a rich block editor, AI writing tools, real-time collaboration, and organizations.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_DESC,
  icons: {
    icon: '/base-logo.png',
    apple: '/base-logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESC,
    url: SITE_URL,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'LixBlogs — Write, collaborate, and publish beautifully',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESC,
    images: ['/og-image.jpg'],
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

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#131922' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kanit:wght@500;600;700&family=Source+Serif+4:wght@400;600;700;800&display=swap" rel="stylesheet" />
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('lixblogs_theme');
              if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Source Serif 4', 'Georgia', serif" }}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js" defer />
        <script noModule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js" defer />
      </body>
    </html>
  );
}
