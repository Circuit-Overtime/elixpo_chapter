/**
 * Next.js Configuration for LixWish
 * Birthday Card Generator with Cloudflare D1 Integration
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable strict mode for development
  reactStrictMode: true,

  // Image optimization
  images: {
    unoptimized: true, // Use for static export if needed
  },

  // Optimizations
  compress: true,
  generateEtags: true,

  // Security headers
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirects (optional)
  redirects: async () => {
    return [];
  },

  // API routes
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
