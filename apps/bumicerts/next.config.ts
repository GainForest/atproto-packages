import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  skipProxyUrlNormalize: true,
  // Compile workspace packages from source so Vercel/Turbopack doesn't need
  // pre-built dist/ output (which is gitignored).
  transpilePackages: [
    "@gainforest/atproto-auth-next",
    "@gainforest/atproto-mutations-core",
    "@gainforest/atproto-mutations-next",
    "@gainforest/internal-utils",
    "@gainforest/generated",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    viewTransition: true,
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
