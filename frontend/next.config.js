/** @type {import('next').NextConfig} */
const normalizeBackendOrigin = (url) => {
  const normalized = (url || '').trim().replace(/\/+$/, '');
  return normalized.replace(/\/api\/v1$/, '');
};

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@messagesender/shared'],
  output: process.env.NEXT_BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'platform-lookaside.fbsbx.com',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent.*.fbcdn.net',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // BACKEND_URL must be backend origin (without /api/v1).
    // If /api/v1 is mistakenly included, normalize it to avoid /api/v1/api/v1 duplication.
    const backendUrl = normalizeBackendOrigin(process.env.BACKEND_URL || 'http://localhost:4000');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
