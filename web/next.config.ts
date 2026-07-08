import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "192.168.1.11:3000"],
    },
  },
};

export default nextConfig;
