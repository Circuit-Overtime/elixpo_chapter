import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      unstablePersistentCaching: false,
    },
  },
};

export default nextConfig;
