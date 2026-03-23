import "./lib/env/server"; // Validate server env vars at build time
import "./lib/env/client"; // Validate client env vars at build time

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  skipProxyUrlNormalize: true,



  // Compile workspace packages from TypeScript source directly.
  // Without this, Turbopack would look for dist/ which is gitignored.
  transpilePackages: [
    "@gainforest/atproto-auth-next",
    "@gainforest/atproto-mutations-core",
    "@gainforest/atproto-mutations-next",
    "@gainforest/internal-utils",
    "@gainforest/generated",
    "multiformats",
  ],

  images: {
    unoptimized: process.env.NODE_ENV === "development",
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
    // Raises the body buffer limit for App Router route handlers (confirmed working
    // locally — overrides the default 10 MB buffer). Audio files are base64-encoded
    // for tRPC transport (~33% inflation): 100 MB raw → ~133 MB on the wire.
    proxyClientMaxBodySize: "150mb",
  },

  turbopack: {
    resolveAlias: {
      // multiformats is ESM-only; @atproto/lexicon's CJS dist tries to
      // require() it. Alias subpaths to their ESM dist so Turbopack handles it.
      "multiformats/cid": "../../node_modules/multiformats/dist/src/cid.js",
      "multiformats/bases/base58": "../../node_modules/multiformats/dist/src/bases/base58.js",
      "multiformats/hashes/digest": "../../node_modules/multiformats/dist/src/hashes/digest.js",
      "multiformats/hashes/hasher": "../../node_modules/multiformats/dist/src/hashes/hasher.js",
    },
  },
};

export default nextConfig;
