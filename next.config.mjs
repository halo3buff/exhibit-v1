/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  serverExternalPackages: ['better-sqlite3', 'puppeteer', 'sharp'],

  turbopack: {},

  async headers() {
    return [
      {
        source: '/img-cache/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;