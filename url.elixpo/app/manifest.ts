import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ElixpoURL',
    short_name: 'ElixpoURL',
    description:
      'Fast URL shortener built on Cloudflare\'s edge — lightning-fast redirects, click analytics, and a developer-first API.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0d12',
    theme_color: '#9b7bf7',
    icons: [
      { src: '/icon0.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon1.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon1.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
