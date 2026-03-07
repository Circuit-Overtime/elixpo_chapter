import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // nodemailer uses Node.js TCP sockets (net, stream, fs) which can't be
  // bundled for Cloudflare edge. Externalize it so webpack skips it.
  serverExternalPackages: ['nodemailer'],
};

export default nextConfig;
