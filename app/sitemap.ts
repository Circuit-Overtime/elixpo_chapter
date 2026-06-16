import type { MetadataRoute } from "next";

const BASE = "https://payouts.elixpo.com";

const ROUTES = [
    "",
    "/pricing",
    "/about",
    "/docs",
    "/docs/quickstart",
    "/docs/checkout",
    "/docs/webhooks",
    "/docs/entitlements",
    "/privacy",
    "/terms",
    "/refunds",
    "/contact",
    "/login",
];

export default function sitemap(): MetadataRoute.Sitemap {
    return ROUTES.map((path) => ({
        url: `${BASE}${path}`,
        changeFrequency: "weekly",
        priority: path === "" ? 1 : 0.7,
    }));
}
