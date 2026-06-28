import type { Metadata, Viewport } from "next";
import { Sofia_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const SITE_URL = "https://payouts.elixpo.com";
const OG_IMAGE = {
    url: "/og-image.png",
    width: 1423,
    height: 747,
    type: "image/png",
    alt: "Elixpo Pay — Payments & Payouts",
};

export const viewport: Viewport = {
    themeColor: "#F3F0EE",
    colorScheme: "light",
};

const sofiaSans = Sofia_Sans({
    variable: "--font-sofia-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {
        default: "Elixpo Pay — Payments & Payouts for the Elixpo ecosystem",
        template: "%s | Elixpo Pay",
    },
    description:
        "Elixpo Pay is the centralized payments + payouts layer for Elixpo. Hosted checkout, a unified ledger, entitlements, and creator payouts on Cloudflare's edge.",
    keywords: [
        "Elixpo",
        "Elixpo Pay",
        "payments",
        "payouts",
        "checkout",
        "Razorpay",
        "subscriptions",
        "entitlements",
        "billing",
    ],
    authors: [{ name: "Elixpo", url: "https://elixpo.com" }],
    creator: "Elixpo",
    publisher: "Elixpo",
    applicationName: "Elixpo Pay",
    category: "finance",
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: "/" },
    manifest: "/manifest.webmanifest",
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: SITE_URL,
        siteName: "Elixpo Pay",
        title: "Elixpo Pay — Payments & Payouts",
        description:
            "Hosted checkout, unified ledger, entitlements, and creator payouts for the Elixpo ecosystem.",
        images: [OG_IMAGE],
    },
    twitter: {
        card: "summary_large_image",
        title: "Elixpo Pay — Payments & Payouts",
        description:
            "The complete money stack for modern software — checkout, subscriptions, entitlements, and payouts.",
        images: [OG_IMAGE.url],
    },
    icons: {
        icon: [
            { url: "/icon.png", sizes: "256x256", type: "image/png" },
            { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
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
            name: "Elixpo Pay",
            publisher: { "@id": `${SITE_URL}/#organization` },
        },
        {
            "@type": "SoftwareApplication",
            name: "Elixpo Pay",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            url: SITE_URL,
            description:
                "Payments and payouts for the Elixpo ecosystem — hosted checkout, a unified ledger, entitlements, and creator payouts on Cloudflare's edge.",
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
                className={`${sofiaSans.variable} ${geistMono.variable} antialiased`}
            >
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(JSON_LD),
                    }}
                />
                {children}
            </body>
        </html>
    );
}
