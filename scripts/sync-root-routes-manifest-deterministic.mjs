import fs from "node:fs";
import path from "node:path";

const repoDir = process.cwd();
const webNextDir = path.join(repoDir, "web", ".next");
const rootNextDir = path.join(repoDir, ".next");
const webDeterministicPath = path.join(webNextDir, "routes-manifest-deterministic.json");
const webRoutesPath = path.join(webNextDir, "routes-manifest.json");
const rootDeterministicPath = path.join(rootNextDir, "routes-manifest-deterministic.json");

// #region agent log
fetch("http://127.0.0.1:7246/ingest/885cecb3-29b5-46db-8fa2-4c6c940007bf", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "1161fc",
  },
  body: JSON.stringify({
    sessionId: "1161fc",
    runId: "post-fix",
    hypothesisId: "H6",
    location: "scripts/sync-root-routes-manifest-deterministic.mjs:11",
    message: "root deterministic manifest sync precheck",
    data: {
      repoDir,
      webDeterministicExists: fs.existsSync(webDeterministicPath),
      webRoutesExists: fs.existsSync(webRoutesPath),
      rootNextExists: fs.existsSync(rootNextDir),
      rootDeterministicExists: fs.existsSync(rootDeterministicPath),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

if (!fs.existsSync(webDeterministicPath) && !fs.existsSync(webRoutesPath)) {
  console.warn("[postbuild-root] no source manifest found in web/.next, skip root sync");
  process.exit(0);
}

fs.mkdirSync(rootNextDir, { recursive: true });
const sourcePath = fs.existsSync(webDeterministicPath) ? webDeterministicPath : webRoutesPath;
fs.copyFileSync(sourcePath, rootDeterministicPath);

console.log(`[postbuild-root] synced ${path.basename(sourcePath)} -> .next/routes-manifest-deterministic.json`);
