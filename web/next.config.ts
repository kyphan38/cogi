import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const tailwindResolved = path.join(appDir, "node_modules", "tailwindcss");
const rootDir = process.cwd();
const rootNextDir = path.join(rootDir, ".next");
const appNextDir = path.join(appDir, ".next");

function logDebug(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch("http://127.0.0.1:7246/ingest/885cecb3-29b5-46db-8fa2-4c6c940007bf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "1161fc",
    },
    body: JSON.stringify({
      sessionId: "1161fc",
      runId: "pre-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

logDebug("H1-H4", "next.config.ts:11", "build context snapshot", {
  cwd: rootDir,
  appDir,
  initCwd: process.env.INIT_CWD ?? null,
  npmCommand: process.env.npm_lifecycle_event ?? null,
  nodeVersion: process.version,
  rootHasNextDir: fs.existsSync(rootNextDir),
  appHasNextDir: fs.existsSync(appNextDir),
  vercelEnv: process.env.VERCEL ?? null,
});

const nextConfig: NextConfig = {
  // Pin tracing root to this app when parent directories have other lockfiles.
  outputFileTracingRoot: appDir,
  // Turbopack project root; PostCSS may still resolve bare imports from parent package.json
  // without an explicit alias — see https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#resolving-aliases
  turbopack: {
    root: appDir,
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
    logDebug("H2-H3", "next.config.ts:51", "webpack config resolved", {
      rootRoutesManifest: path.join(rootNextDir, "routes-manifest.json"),
      appRoutesManifest: path.join(appNextDir, "routes-manifest.json"),
      rootDeterministicManifest: path.join(rootNextDir, "routes-manifest-deterministic.json"),
      appDeterministicManifest: path.join(appNextDir, "routes-manifest-deterministic.json"),
    });
    return config;
  },
};

export default nextConfig;
