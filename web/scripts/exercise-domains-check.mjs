/**
 * Run: npm run check:exercise-domains
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const runner = `
import {
  EXERCISE_DOMAIN_CATALOG,
  EXERCISE_DOMAIN_SUGGESTIONS,
} from "./src/lib/exercise/exercise-domain-catalog.ts";
import { GEOPOLITICS_SUBDOMAINS } from "./src/lib/exercise/geopolitics-domains.ts";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
}

const seen = new Set();
for (const group of EXERCISE_DOMAIN_CATALOG) {
  assert(group.id && group.label, "group missing id/label");
  for (const d of group.domains) {
    assert(d.trim().length > 0, "empty domain in " + group.id);
    assert(!seen.has(d), "duplicate domain: " + d);
    seen.add(d);
  }
}

assert(
  EXERCISE_DOMAIN_SUGGESTIONS.length >= 30,
  "expected at least 30 catalog domains, got " + EXERCISE_DOMAIN_SUGGESTIONS.length,
);

for (const sub of GEOPOLITICS_SUBDOMAINS) {
  assert(EXERCISE_DOMAIN_SUGGESTIONS.includes(sub), "geo subdomain missing from suggestions: " + sub);
}

console.log(
  "OK: exercise-domains-check",
  EXERCISE_DOMAIN_SUGGESTIONS.length,
  "domains (incl.",
  GEOPOLITICS_SUBDOMAINS.length,
  "geopolitics)",
);
`;

const result = spawnSync("npx", ["--yes", "tsx", "-e", runner], {
  cwd: root,
  encoding: "utf8",
  stdio: "pipe",
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}
console.log(result.stdout.trim());
