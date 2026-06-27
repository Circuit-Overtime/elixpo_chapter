import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono, Almarai, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { MegaNavbar } from "@/components/MegaNavbar";
import { Footer } from "@/components/Footer";

// Global dark shell - overrides the semantic theme tokens to dark so every
// route matches, and applies the design font.
const darkShell = {
  "--background": "#000000",
  "--foreground": "#E1E0CC",
  "--card": "#161616",
  "--card-hover": "#1d1d1d",
  "--muted": "#9a988c",
  "--border": "rgba(255,255,255,0.12)",
  "--accent": "#DEDBC8",
  "--accent-light": "#E1E0CC",
  fontFamily: "var(--font-almarai), sans-serif",
} as CSSProperties;

export const viewport: Viewport = {
  themeColor: "#000000",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display fonts for the revamped homepage design.
const almarai = Almarai({
  variable: "--font-almarai",
  weight: ["300", "400", "700", "800"],
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const SITE_URL = "https://elixpo.com";

const SITE_DESCRIPTION =
  "Elixpo is a developer-first, open-source ecosystem that brings together AI-powered applications, developer tools, creative platforms, and community-driven services. From collaborative whiteboards and code editors to blogging, authentication, URL management, and intelligent workflows, Elixpo empowers developers to build, collaborate, and innovate together. Proudly open source and maintained by a global community of contributors under MIT and CC BY 4.0 licenses.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Elixpo",
  title: {
    default: "Elixpo - Open Source Ecosystem of AI and Developer Tools",
    template: "%s | Elixpo",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Elixpo",
    "open source",
    "AI",
    "Artificial Intelligence",
    "AI tools",
    "developer tools",
    "LixSketch",
    "LixEditor",
    "Elixpo Blogs",
    "Elixpo Accounts",
    "SVG whiteboard",
    "block editor",
    "AI art generation",
    "Next.js",
    "Cloudflare",
    "Pollinations AI",
    "Hacktoberfest",
    "MIT license",
    "Developer Platform",
    "Developer Tools",
    "Open Source Software",
    "Productivity",
    "Next.js",
  ],
  authors: [{ name: "Ayushman Bhattacharya", url: "https://github.com/Circuit-Overtime" }],
  creator: "Elixpo",
  publisher: "Elixpo",
  category: "technology",
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logos/logo.webp", type: "image/webp" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-icon.png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Elixpo",
    title: "Elixpo - Open Source Ecosystem of AI and Developer Tools",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/og-image.webp",
        width: 1852,
        height: 813,
        type: "image/webp",
        alt: "Elixpo — Developer-first open-source ecosystem"
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elixpo - Open Source Ecosystem of AI and Developer Tools",
    description:
      "Build, collaborate, and innovate with Elixpo—an open-source ecosystem of AI-powered applications, developer tools, and community-drven platforms for modern developers.",
    images: ["/og-image.webp"],
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
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${almarai.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SmoothScroll />
        <div
          className="bg-background text-foreground min-h-screen flex flex-col overflow-x-hidden antialiased selection:bg-primary selection:text-black"
          style={darkShell}
        >
          <MegaNavbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
