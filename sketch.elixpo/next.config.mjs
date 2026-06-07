import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: [
    '@elixpo/lixeditor',
    '@blocknote/core',
    '@blocknote/react',
    '@blocknote/mantine',
  ],

  turbopack: {
    rules: {
      '*.md': {
        loaders: [require_.resolve('raw-loader')],
        as: '*.js',
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    })

    // Webpack 5 doesn't honor the `exports` field of
    // @handlewithcare/prosemirror-inputrules correctly — `import 'pkg'`
    // fails to resolve `.`. Point the bare specifier at the dist entry
    // we know exists in node_modules.
    try {
      const pkgPath = require_.resolve('@handlewithcare/prosemirror-inputrules/package.json')
      const pkgDir = pkgPath.replace(/\/package\.json$/, '')
      const pkg = require_(pkgPath)
      const main = pkg.module || pkg.main || 'dist/index.js'
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@handlewithcare/prosemirror-inputrules$': `${pkgDir}/${main}`,
      }
    } catch {}

    return config
  },
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
