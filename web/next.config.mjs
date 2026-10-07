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
      {
        source: "/docs",
        destination: `${internalUrl}/docs`,
      },
      {
        source: "/docs/:path*",
        destination: `${internalUrl}/docs/:path*`,
      },
      {
        source: "/openapi.json",
        destination: `${internalUrl}/openapi.json`,
      },
      {
        source: "/redoc",
        destination: `${internalUrl}/redoc`,
      },
    ];
  },
};

export default nextConfig;
