import type { NextConfig } from "next";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const tailwindResolved = path.join(appDir, "node_modules", "tailwindcss");
const requireFromConfig = createRequire(import.meta.url);
const resolveFromAppDir = (() => {
  try {
    return requireFromConfig.resolve("next/package.json", { paths: [appDir] });
  } catch {
    return null;
  }
})();
const resolveFromCwd = (() => {
  try {
    return requireFromConfig.resolve("next/package.json", {
      paths: [process.cwd()],
    });
  } catch {
    return null;
  }
})();

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
    hypothesisId: "H1-H3",
    location: "next.config.ts:9",
    message: "next config load context",
    data: {
      cwd: process.cwd(),
      appDir,
      initCwd: process.env.INIT_CWD ?? null,
      npmPrefix: process.env.npm_config_prefix ?? null,
      npmLocalPrefix: process.env.npm_config_local_prefix ?? null,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

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
    hypothesisId: "H4",
    location: "next.config.ts:35",
    message: "next package resolution probes",
    data: {
      resolveFromAppDir,
      resolveFromCwd,
      nodeVersion: process.version,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

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
    return config;
  },
};

export default nextConfig;
