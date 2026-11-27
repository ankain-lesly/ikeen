import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/types", "@repo/utils"],
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/legacy/dashboard",
        permanent: false,
      },
      {
        source: "/dashboard/:path*",
        destination: "/legacy/dashboard/:path*",
        permanent: false,
      },
      {
        source: "/mcp",
        destination: "/legacy/mcp",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
