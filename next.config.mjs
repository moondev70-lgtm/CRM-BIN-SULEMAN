/** @type {import('next').NextConfig} */
const nextConfig = {
  // Serverful Next.js app (API routes for webhooks/workers).
  // NOTE: unlike the public website, this app must NEVER use output:'export'.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
