/**
 * Run: node scripts/geopolitics-progression-check.mjs
 * Smoke tests for geopolitics progression state (via npx tsx).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const runner = `
import {
  computeGeopoliticsProgressionState,
  GEOPOLITICS_PROGRESSION,
} from "./src/lib/exercise/geopolitics-progression.ts";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

const empty = computeGeopoliticsProgressionState([]);
assert(empty === null, "empty completed -> null");

const geo1 = {
  type: "analytical",
  domain: "Realist lens - power, security, self-interest",
  completedAt: "2026-01-01T00:00:00.000Z",
  isGeopolitics: true,
};
const s1 = computeGeopoliticsProgressionState([geo1]);
assert(s1 !== null, "one geo completion -> state");
assert(s1.activePhaseIndex === 0, "starts phase 0");
assert(s1.phaseCompletionsCount === 1, "counts phase match");
assert(
  s1.recommendedSubdomain.includes("Liberal") || s1.recommendedSubdomain.includes("Southeast"),
  "recommends uncompleted subdomain in phase",
);

const phase0Target = GEOPOLITICS_PROGRESSION[0].targetExercises;
const phase0Fill = GEOPOLITICS_PROGRESSION[0].subdomains.flatMap((domain, i) =>
  Array.from({ length: 2 }, (_, j) => ({
    type: i % 2 === 0 ? "analytical" : "systems",
    domain,
    completedAt: \`2026-01-\${String(j + 1).padStart(2, "0")}T00:00:00.000Z\`,
    isGeopolitics: true,
  })),
).slice(0, phase0Target);

const s2 = computeGeopoliticsProgressionState(phase0Fill);
assert(s2.activePhaseIndex === 1, "advances to phase 1 after phase 0 target");

const nonGeo = {
  type: "analytical",
  domain: "Product strategy",
  completedAt: "2026-01-01T00:00:00.000Z",
};
assert(computeGeopoliticsProgressionState([nonGeo]) === null, "non-geo ignored");

console.log("OK: geopolitics-progression-check");
`;

const result = spawnSync(
  "npx",
  ["--yes", "tsx", "-e", runner],
  { cwd: root, encoding: "utf8", stdio: "pipe" },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
console.log(result.stdout.trim());
