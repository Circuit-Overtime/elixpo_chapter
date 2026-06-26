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
        default: "Elixpo Accounts: Secure Sign In & Authentication",
        template: "%s | Elixpo Accounts",
    },
    description:
        "Sign in to Elixpo Accounts with Google, GitHub, or email. Secure OAuth 2.0 authentication, single sign-on (SSO), and identity management for all Elixpo services.",
    keywords: [
        "Elixpo",
        "Elixpo Accounts",
        "sign in",
        "login",
        "OAuth",
        "SSO",
        "single sign-on",
        "authentication",
        "Google sign in",
        "GitHub sign in",
        "identity provider",
        "secure login",
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
        title: "Elixpo Accounts: Secure Sign In & Authentication",
        description:
            "Sign in to Elixpo Accounts with Google, GitHub, or email. Secure OAuth 2.0 single sign-on for all Elixpo services.",
        images: [
            {
                url: "/og-image.png",
                width: 1845,
                height: 880,
                alt: "Elixpo Accounts: Secure Sign In & Authentication",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Elixpo Accounts: Secure Sign In & Authentication",
        description:
            "Sign in with Google, GitHub, or email. Secure OAuth 2.0 authentication for all Elixpo services.",
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
