/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api-backend/:path*',
        destination: `${process.env.INTERNAL_API_URL || 'https://cashready.masud-rana.me/api-backend'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
