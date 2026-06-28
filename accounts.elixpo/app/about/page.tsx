import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const runtime = "edge";

export const metadata: Metadata = {
    title: "About",
    description:
        "Learn about Elixpo Accounts, the central OAuth 2.0 Identity Provider and Single Sign-On (SSO) gateway for the Elixpo ecosystem. Discover our secure, edge-first architecture built on Cloudflare Workers and D1.",
    openGraph: {
        title: "About Elixpo Accounts",
        description:
            "Learn about Elixpo Accounts, the central OAuth 2.0 Identity Provider and Single Sign-On (SSO) gateway for the Elixpo ecosystem.",
        images: [
            {
                url: "/og-image.png",
                width: 1280,
                height: 720,
                alt: "About Elixpo Accounts",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "About Elixpo Accounts",
        description:
            "Learn about Elixpo Accounts, the central OAuth 2.0 Identity Provider and Single Sign-On (SSO) gateway for the Elixpo ecosystem.",
        images: ["/og-image.png"],
    },
};

export default function AboutPage() {
    return <AboutClient />;
}
