import fs from "node:fs";
import path from "node:path";

const appDir = process.cwd();
const nextDir = path.join(appDir, ".next");
const srcPath = path.join(nextDir, "routes-manifest.json");
const dstPath = path.join(nextDir, "routes-manifest-deterministic.json");

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
    hypothesisId: "H5",
    location: "scripts/ensure-routes-manifest-deterministic.mjs:9",
    message: "postbuild deterministic manifest check",
    data: {
      appDir,
      srcExists: fs.existsSync(srcPath),
      dstExists: fs.existsSync(dstPath),
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

if (!fs.existsSync(srcPath)) {
  console.warn("[postbuild] routes-manifest.json not found, skip deterministic manifest copy");
  process.exit(0);
}

if (fs.existsSync(dstPath)) {
  console.log("[postbuild] routes-manifest-deterministic.json already exists");
  process.exit(0);
}

fs.copyFileSync(srcPath, dstPath);
console.log("[postbuild] created routes-manifest-deterministic.json from routes-manifest.json");
