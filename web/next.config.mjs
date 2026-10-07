/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const internalUrl =
      process.env.INTERNAL_API_URL || process.env.API_INTERNAL_URL || "http://127.0.0.1:8100";
    return [
      {
        source: "/api-backend/:path*",
        destination: `${internalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
