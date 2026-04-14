import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load env vars from the project root .env
config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ELIXPO_ACCOUNTS_CLIENT_ID: process.env.NEXT_PUBLIC_ELIXPO_ACCOUNTS_CLIENT_ID || "",
    NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI || "",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    ELIXPO_ACCOUNTS_CLIENT_SECRET: process.env.ELIXPO_ACCOUNTS_CLIENT_SECRET || "",
  },
};

export default nextConfig;
