import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BackgroundAurora from "./components/background-aurora";
import "./globals.css";

const SITE_URL = "https://mail.elixpo.com";
const OG_IMAGE = {
    url: "/og-image.png",
    width: 1200,
    height: 630,
    type: "image/png",
    alt: "mail.elixpo — Event-based transactional email",
};

export const viewport: Viewport = {
    themeColor: "#0b0d12",
    colorScheme: "dark",
};

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
        default: "mail.elixpo — Event-based transactional email for the Elixpo ecosystem",
        template: "%s | mail.elixpo",
    },
    description:
        "mail.elixpo lets businesses send event-based transactional email without building mail infra. Bring your own sender, design templates with {{variable}} placeholders in a live WYSIWYG editor, and trigger sends from your service via webhook on Cloudflare's edge.",
    keywords: [
        "Elixpo",
        "mail.elixpo",
        "transactional email",
        "email templates",
        "email API",
        "WYSIWYG email",
        "webhook email",
        "SMTP",
        "multi-tenant",
        "bring your own sender",
    ],
    authors: [{ name: "Elixpo", url: "https://elixpo.com" }],
    creator: "Elixpo",
    publisher: "Elixpo",
    applicationName: "mail.elixpo",
    category: "technology",
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "/" },
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: SITE_URL,
        siteName: "mail.elixpo",
        title: "mail.elixpo — Event-based transactional email",
        description:
            "Bring your own sender, design templates with {{variables}}, and trigger transactional email from your service via webhook — on Cloudflare's edge.",
        images: [OG_IMAGE],
    },
    twitter: {
        card: "summary_large_image",
        title: "mail.elixpo — Event-based transactional email",
        description:
            "The transactional email layer for modern software — bring your own sender, design templates with live preview, and send via webhook.",
        images: [OG_IMAGE.url],
    },
    icons: {
        // Served as static assets from public/. Kept out of app/ so
        // @cloudflare/next-on-pages doesn't turn each into an edge route.
        icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/icon.png", sizes: "256x256", type: "image/png" },
            { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        shortcut: "/favicon.ico",
        apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
};

// Structured data so search engines render rich results for the org + product.
const JSON_LD = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "Elixpo",
            url: "https://elixpo.com",
            logo: `${SITE_URL}/icon-512.png`,
        },
        {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: "mail.elixpo",
            publisher: { "@id": `${SITE_URL}/#organization` },
        },
        {
            "@type": "SoftwareApplication",
            name: "mail.elixpo",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: SITE_URL,
            description:
                "Event-based transactional email for the Elixpo ecosystem — bring your own sender, design templates with {{variable}} placeholders in a WYSIWYG editor, and trigger sends via webhook on Cloudflare's edge.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            publisher: { "@id": `${SITE_URL}/#organization` },
        },
    ],
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <script
                    type="application/ld+json"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
                />
                {/* Single dark aurora behind every route. Individual shells no
                    longer render their own — this guarantees a consistent
                    background everywhere, including bare/404/error routes. */}
                <BackgroundAurora />
                <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
                    {children}
                </div>
            </body>
        </html>
    );
}
