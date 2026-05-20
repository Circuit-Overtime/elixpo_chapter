import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header         from "@/components/Header";
import Footer         from "@/components/Footer";
import PageTransition from "@/components/PageTransition";

// SEO + social-card metadata. The og-banner.png referenced here is the
// same artwork used as the README banner on the main repo — generated
// from `prompts/site_assets.md` and dropped into /public/og-banner.png.
// Keeping a single image for both surfaces means a contributor only
// has to refresh one file when the brand shifts.

const SITE_TITLE       = "OreoOS — an open-source OS in a pocket-sized badge";
const SITE_DESCRIPTION =
  "OreoOS - Micropython inside your pocket";
const SITE_URL  = "https://oreo.elixpo.com";
const OG_IMAGE  = "/og-banner.jpg";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  SITE_TITLE,
    template: "%s · Oreo",
  },
  description: SITE_DESCRIPTION,
  applicationName: "OreoOS",
  authors: [{ name: "Elixpo", url: "https://github.com/elixpo" }],
  generator: "Next.js",
  keywords: [
    "OreoOS", "Elixpo Badge", "conference badge", "MicroPython",
    "ESP32-S3", "open hardware", "open source OS", "app store",
    "file transfer", "BLE", "WiFi", "IR quest",
  ],
  // Per-route titles override `default` via Next's metadata API;
  // robots gets allow-everywhere here because the site is fully public.
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "Oreo",
    type: "website",
    locale: "en_US",
    images: [{
      url:     OG_IMAGE,
      width:   1200,
      height:  630,
      alt:     "Oreo Badge, with your favourite mascot and a stylish lanyard!"
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  // Icons — pulled from the same mascot.png the header + footer use,
  // so the favicon/apple-touch-icon look identical to the in-page
  // wordmark. Pixel-art works at every favicon size; Cloudflare Pages
  // serves the file verbatim from /public.
  icons: {
    icon:     [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple:    "/favicon.png",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

// Next 14 moved themeColor / colorScheme out of `metadata` into a
// separate `viewport` export — they're per-render rather than static.
export const viewport: Viewport = {
  themeColor: "#0F0C1C",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
      </body>
    </html>
  );
}
