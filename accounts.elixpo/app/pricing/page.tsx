import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const runtime = "edge";

export const metadata: Metadata = {
    title: "Pricing",
    description:
        "Transparent, developer-first pricing for Elixpo Accounts. Start for free on our Hobby plan and scale seamlessly as your application's user base grows.",
    openGraph: {
        title: "Pricing Plans — Elixpo Accounts",
        description:
            "Transparent, developer-first pricing for Elixpo Accounts. Scale seamlessly as your application's user base grows.",
        images: [
            {
                url: "/og-image.png",
                width: 1280,
                height: 720,
                alt: "Elixpo Accounts Pricing Plans",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Pricing Plans — Elixpo Accounts",
        description:
            "Transparent, developer-first pricing for Elixpo Accounts. Scale seamlessly as your application's user base grows.",
        images: ["/og-image.png"],
    },
};

export default function PricingPage() {
    return <PricingClient />;
}
