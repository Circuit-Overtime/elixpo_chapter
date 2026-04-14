import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load env vars from the project root .env
config({ path: resolve(__dirname, "../.env") });

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:7001";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ELIXPO_ACCOUNTS_CLIENT_ID: process.env.NEXT_PUBLIC_ELIXPO_ACCOUNTS_CLIENT_ID || "",
    NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI || "",
    ELIXPO_ACCOUNTS_CLIENT_SECRET: process.env.ELIXPO_ACCOUNTS_CLIENT_SECRET || "",
  },
  async rewrites() {
    return [
      {
        source: "/api/detect/:path*",
        destination: `${BACKEND_URL}/api/detect/:path*`,
      },
      {
        source: "/api/paraphrase/:path*",
        destination: `${BACKEND_URL}/api/paraphrase/:path*`,
      },
      {
        source: "/api/session/:path*",
        destination: `${BACKEND_URL}/api/session/:path*`,
      },
      {
        source: "/api/job/:path*",
        destination: `${BACKEND_URL}/api/job/:path*`,
      },
      {
        source: "/api/report/:path*",
        destination: `${BACKEND_URL}/api/report/:path*`,
      },
      {
        source: "/api/health",
        destination: `${BACKEND_URL}/api/health`,
      },
    ];
  },
};

export default nextConfig;
