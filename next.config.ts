import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Excalidraw uses canvas which needs special handling
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      encoding: false,
    };
    return config;
  },
  // Acknowledge webpack config exists (required in Next.js 16 with Turbopack)
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
