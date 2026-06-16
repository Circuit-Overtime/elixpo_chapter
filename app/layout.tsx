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
    metadataBase: new URL("https://payouts.elixpo.com"),
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://payouts.elixpo.com",
        siteName: "Elixpo Pay",
        title: "Elixpo Pay — Payments & Payouts",
        description:
            "Hosted checkout, unified ledger, entitlements, and creator payouts for the Elixpo ecosystem.",
        images: [{ url: "/og-image.png", alt: "Elixpo Pay" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Elixpo Pay — Payments & Payouts",
        description:
            "The complete money stack for modern software — checkout, subscriptions, entitlements, and payouts.",
        images: ["/og-image.png"],
    },
    icons: {
        // Served as static assets from public/. Kept out of app/ so
        // @cloudflare/next-on-pages doesn't turn each into an edge route.
        icon: [
            { url: "/icon.png", sizes: "256x256", type: "image/png" },
            { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    },
    robots: { index: true, follow: true },
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
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
