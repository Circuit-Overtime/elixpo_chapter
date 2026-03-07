import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Elixpo Accounts — Secure Sign In & Authentication',
    template: '%s | Elixpo Accounts',
  },
  description:
    'Sign in to Elixpo Accounts with Google, GitHub, or email. Secure OAuth 2.0 authentication, single sign-on (SSO), and identity management for all Elixpo services.',
  keywords: [
    'Elixpo',
    'Elixpo Accounts',
    'sign in',
    'login',
    'OAuth',
    'SSO',
    'single sign-on',
    'authentication',
    'Google sign in',
    'GitHub sign in',
    'identity provider',
    'secure login',
  ],
  authors: [{ name: 'Elixpo', url: 'https://elixpo.com' }],
  creator: 'Elixpo',
  publisher: 'Elixpo',
  metadataBase: new URL('https://accounts.elixpo.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://accounts.elixpo.com',
    siteName: 'Elixpo Accounts',
    title: 'Elixpo Accounts — Secure Sign In & Authentication',
    description:
      'Sign in to Elixpo Accounts with Google, GitHub, or email. Secure OAuth 2.0 single sign-on for all Elixpo services.',
    images: [
      {
        url: '/LOGO/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Elixpo Accounts — Secure Sign In & Authentication',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Elixpo Accounts — Secure Sign In & Authentication',
    description:
      'Sign in with Google, GitHub, or email. Secure OAuth 2.0 authentication for all Elixpo services.',
    images: ['/LOGO/og-image.png'],
  },
  icons: {
    icon: '/LOGO/logo.png',
    apple: '/LOGO/logo.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
