/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api-backend/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'http://api:8100'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
