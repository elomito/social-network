const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  turbopack: {
    root: __dirname,
    resolveAlias: {
      // Turbopack requires explicit glob-style mapping for wildcard aliases.
      // A plain '@' key only matches the literal string '@', not '@/foo/bar'.
      // The correct form maps '@/*' to the array of possible expansions.
      '@/*': ['./src/*'],
    },
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
}

module.exports = nextConfig