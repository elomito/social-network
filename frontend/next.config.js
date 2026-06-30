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
  // Configure path aliases for Turbopack
  turbopack: {
    resolveAlias: {
      '@/*': './src/*',
    },
  },
};

module.exports = nextConfig;
