import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // eslint-config-next sub-modules (core-web-vitals, typescript) are not
    // available in this environment — skip ESLint at build time.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
