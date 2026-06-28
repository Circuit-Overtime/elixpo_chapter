import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { THEME_BOOT_SCRIPT, ThemeProvider } from "./components/theme-provider";

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
        default: "Elixpo Accounts — Secure Single Sign-On & OAuth Provider",
        template: "%s | Elixpo Accounts",
    },
    description:
        "Access the developer portal and authenticate securely across all Elixpo services. Built with edge-native runtime, Web Crypto API, and passwordless authentication.",
    keywords: [
        "Elixpo",
        "Elixpo Accounts",
        "OAuth 2.0 Provider",
        "Single Sign-On",
        "SSO",
        "Passkeys",
        "WebAuthn",
        "Edge authentication",
        "Identity Provider",
        "Developer dashboard",
        "Secure login",
    ],
    authors: [{ name: "Elixpo", url: "https://elixpo.com" }],
    creator: "Elixpo",
    publisher: "Elixpo",
    metadataBase: new URL("https://accounts.elixpo.com"),
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://accounts.elixpo.com",
        siteName: "Elixpo Accounts",
        title: "Elixpo Accounts — Secure Single Sign-On & OAuth Provider",
        description:
            "Access the developer portal and authenticate securely across all Elixpo services. Built with edge-native runtime, Web Crypto API, and passwordless authentication.",
        images: [
            {
                url: "/og-image.png",
                width: 1280,
                height: 720,
                alt: "Elixpo Accounts — Secure Single Sign-On & OAuth Provider",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Elixpo Accounts — Secure Single Sign-On & OAuth Provider",
        description:
            "Access the developer portal and authenticate securely across all Elixpo services. Built with edge-native runtime, Web Crypto API, and passwordless authentication.",
        images: ["/og-image.png"],
    },
    icons: {
        // Served as static assets from public/. Keeping them out of app/
        // avoids @cloudflare/next-on-pages turning each into an edge
        // route that needs `export const runtime = 'edge'`.
        icon: [
            { url: "/icon.png", sizes: "32x32", type: "image/png" },
            { url: "/icon0.png", sizes: "192x192", type: "image/png" },
            { url: "/icon1.png", sizes: "512x512", type: "image/png" },
        ],
        apple: {
            url: "/apple-icon.png",
            sizes: "180x180",
            type: "image/png",
        },
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
        <html lang="en" data-theme="light" suppressHydrationWarning>
            <head>
                {/* Set the saved theme before first paint (no flash). */}
                {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
                <script
                    dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
                />
                <link
                    rel="stylesheet"
                    href="https://db.onlinewebfonts.com/c/04e6981992c0e2e7642af2074ebe3901?family=Helvetica+Now+Display+Bold"
                    type="text/css"
                />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
