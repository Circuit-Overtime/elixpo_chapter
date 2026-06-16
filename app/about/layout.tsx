import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
    title: "The Platform",
    description:
        "Elixpo Pay is one money stack — hosted checkout, a unified ledger, entitlements, provider adapters, and creator payouts — built on Cloudflare's edge.",
    alternates: { canonical: "/about" },
    openGraph: {
        title: "The Platform | Elixpo Pay",
        description:
            "Hosted checkout, unified ledger, entitlements, and creator payouts — one money stack on the edge.",
        url: "https://payouts.elixpo.com/about",
    },
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
