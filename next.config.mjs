import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

/** @type {import('next').NextConfig} */
const nextConfig = {};

if (process.env.NODE_ENV === 'development') {
  const { existsSync } = await import('node:fs');
  if (existsSync('.dev.vars')) {
    throw new Error(
      'Remove .dev.vars before starting local development; .env.local is the authoritative local secret file.',
    );
  }

  const { config } = await import('dotenv');
  const localEnv = config({ path: '.env.local', override: true, quiet: true });

  if (localEnv.error) {
    throw new Error(
      'Local development requires .env.local. Copy the local secret template or request the development secrets before starting Next.js.',
      { cause: localEnv.error },
    );
  }

  // setupDevPlatform uses Wrangler's platform proxy for D1/KV. Forward the
  // already-loaded .env.local values so Cloudflare bindings and process.env
  // see the same local configuration. A .dev.vars file must not be present,
  // because Wrangler gives it precedence over dotenv files.
  process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV = 'true';
  await setupDevPlatform();
}

export default nextConfig;
