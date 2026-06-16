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
