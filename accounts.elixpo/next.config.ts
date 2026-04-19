import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config, { isServer }) => {
        // Prevent webpack from trying to bundle nodemailer (Node.js-only)
        // into edge runtime chunks. It's dynamically imported at runtime only
        // in local dev (next dev) as a fallback when cloudflare:sockets is unavailable.
        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push("nodemailer");
        }
        return config;
    },
};

export default nextConfig;
