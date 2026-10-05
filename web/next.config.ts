import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const tailwindResolved = path.join(appDir, "node_modules", "tailwindcss");

// Firebase Auth handler served from cogi's own domain. Safari (iPhone, iPad)
// blocks the cross-site storage that a firebaseapp.com handler needs, so the
// Google popup "closes" with no result. Same domain fixes it.
const FIREBASE_AUTH_HOST = "https://kyphan38-cogi-app.firebaseapp.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: `${FIREBASE_AUTH_HOST}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `${FIREBASE_AUTH_HOST}/__/firebase/:path*` },
    ];
  },
  turbopack: {
    resolveAlias: {
      tailwindcss: tailwindResolved,
    },
  },
  webpack: (config) => {
    const prev = config.resolve?.alias;
    const base =
      prev && typeof prev === "object" && !Array.isArray(prev)
        ? (prev as Record<string, string | false | string[]>)
        : {};
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...base,
      tailwindcss: tailwindResolved,
    };
    return config;
  },
};

export default nextConfig;