import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX({
  // If your source.config.ts is in root
  configPath: "source.config.ts",
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
      remotePatterns: [
        {
           hostname: "*"
        }
      ]
  },
  experimental: {
    turbo: {
      root: "/Users/yahikonamikaze/Documents/My_project/FingUI/fingui",
    },
  },
}

export default withMDX(nextConfig)
