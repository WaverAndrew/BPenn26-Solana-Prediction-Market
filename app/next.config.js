const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Force Next.js to transpile these ESM-only packages through its own compiler
  // instead of serving their raw ESM chunks to the browser (which causes ChunkLoadError)
  transpilePackages: [
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-wallets",
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-phantom",
  ],

  webpack: (config) => {
    // Node built-in stubs for browser
    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
      crypto: false,
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
    };

    // Replace the broken mobile adapter (ESM syntax inside a CJS file) with an empty stub
    config.resolve.alias["@solana-mobile/wallet-adapter-mobile"] = path.resolve(
      __dirname,
      "src/lib/empty-module.js"
    );

    return config;
  },
};

module.exports = nextConfig;
