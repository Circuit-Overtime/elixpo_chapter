import type { Metadata } from "next";
import DocsClientLayout from "./DocsClientLayout";

export const runtime = "edge";

export const metadata: Metadata = {
    title: {
        default: "Documentation",
        template: "%s | Elixpo Docs",
    },
    description:
        "Developer documentation for Elixpo Accounts. Read our guides, learn how to integrate OAuth 2.0 with PKCE, implement webhooks, and manage API keys.",
    openGraph: {
        title: "Documentation — Elixpo Accounts",
        description:
            "Developer documentation for Elixpo Accounts. Read our guides, learn how to integrate OAuth 2.0 with PKCE, implement webhooks, and manage API keys.",
        images: [
            {
                url: "/og-docs.png",
                width: 1280,
                height: 720,
                alt: "Elixpo Accounts Developer Documentation",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Documentation — Elixpo Accounts",
        description:
            "Developer documentation for Elixpo Accounts. Read our guides, learn how to integrate OAuth 2.0 with PKCE, implement webhooks, and manage API keys.",
        images: ["/og-docs.png"],
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <DocsClientLayout>{children}</DocsClientLayout>;
}
