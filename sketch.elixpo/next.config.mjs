import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false
};

if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform({
    bindings: {
      D1_DATABASES: {
        DB: {
          database_name: 'lixsketch',
          database_id: '65fc6d04-d659-4cb6-b34c-750a763693e4',
          migrations_dir: 'worker/migrations',
        },
      },
      KV_NAMESPACES: {
        KV: {
          id: 'aa3a1466b15e443a8f0858c3b9a776c8',
        },
      },
    },
  })
}

export default nextConfig;
