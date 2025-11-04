/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'x-powered-by', value: 'Next.js' }
        ]
      }
    ];
  }
};

module.exports = nextConfig;

