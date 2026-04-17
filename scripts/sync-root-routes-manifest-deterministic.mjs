import fs from "node:fs";
import path from "node:path";

const repoDir = process.cwd();
const webNextDir = path.join(repoDir, "web", ".next");
const rootNextDir = path.join(repoDir, ".next");
const webDeterministicPath = path.join(webNextDir, "routes-manifest-deterministic.json");
const webPagesManifestPath = path.join(webNextDir, "server", "pages-manifest.json");
const rootDeterministicPath = path.join(rootNextDir, "routes-manifest-deterministic.json");
const rootPagesManifestPath = path.join(rootNextDir, "server", "pages-manifest.json");

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
      webNextExists: fs.existsSync(webNextDir),
      webDeterministicExists: fs.existsSync(webDeterministicPath),
      webPagesManifestExists: fs.existsSync(webPagesManifestPath),
      rootNextExists: fs.existsSync(rootNextDir),
      rootDeterministicExists: fs.existsSync(rootDeterministicPath),
      rootPagesManifestExists: fs.existsSync(rootPagesManifestPath),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

if (!fs.existsSync(webNextDir)) {
  console.warn("[postbuild-root] web/.next not found, skip root sync");
  process.exit(0);
}

fs.cpSync(webNextDir, rootNextDir, { recursive: true });

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
    hypothesisId: "H7",
    location: "scripts/sync-root-routes-manifest-deterministic.mjs:44",
    message: "root next sync postcheck",
    data: {
      rootDeterministicExists: fs.existsSync(rootDeterministicPath),
      rootPagesManifestExists: fs.existsSync(rootPagesManifestPath),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

console.log("[postbuild-root] synced web/.next -> .next");
