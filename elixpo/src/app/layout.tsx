import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://elixpo.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Elixpo — Enhanced Learning and Intelligence Process Optimization",
    template: "%s | Elixpo",
  },
  description:
    "A developer-first open-source ecosystem of 13+ interconnected projects — AI art, intelligent search, collaborative sketching, and more. 100% free, forever.",
  keywords: [
    "Elixpo",
    "open source",
    "AI",
    "developer tools",
    "art generation",
    "search engine",
    "collaborative canvas",
    "discord bot",
    "URL shortener",
    "Next.js",
    "Cloudflare",
    "Pollinations AI",
    "Hacktoberfest",
  ],
  authors: [{ name: "Ayushman Bhattacharya", url: "https://github.com/Circuit-Overtime" }],
  creator: "Elixpo",
  publisher: "Elixpo",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Elixpo",
    title: "Elixpo — Developer-First Open Source Ecosystem",
    description:
      "13+ interconnected open-source projects spanning AI, web, and developer tools. Built by a global community of 35+ contributors.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Elixpo — Enhanced Learning and Intelligence Process Optimization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elixpo — Developer-First Open Source Ecosystem",
    description:
      "13+ interconnected open-source projects spanning AI, web, and developer tools. 100% free, forever.",
    images: ["/og-image.png"],
    creator: "@elixpo",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
