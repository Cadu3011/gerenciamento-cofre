import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "177.200.115.10:3000"],
    },
  },
};

export default nextConfig;
