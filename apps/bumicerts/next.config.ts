import "./lib/env/server"; // Validate server env vars at build time
import "./lib/env/client"; // Validate client env vars at build time

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { links } from "./lib/links";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  skipProxyUrlNormalize: true,

  async redirects() {
    return [
      {
        source: "/upload/trees/manage",
        destination: links.manage.trees,
        permanent: true,
      },
      {
        source: "/upload/trees/upload",
        destination: links.manage.treesUpload,
        permanent: true,
      },
    ];
  },

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

export default withSentryConfig(nextConfig, {
  // Sentry org + project. Required for source-map upload during production
  // builds. Reading from env keeps the values out of source control and lets
  // staging/prod target different Sentry projects.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only log Sentry plugin output in CI; keeps local builds quiet.
  silent: !process.env.CI,

  // Upload a wider set of source maps so server + edge stack traces are
  // human-readable, not just the client bundle.
  widenClientFileUpload: true,
});
