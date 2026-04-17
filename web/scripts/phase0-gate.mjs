#!/usr/bin/env node
/**
 * Phase 0 IMP-12 helper: POST /api/ai five times (needs dev server + GEMINI_API_KEY + APP_API_SECRET in env).
 *
 *   cd web && npm run dev   # other terminal
 *   cd web && npm run gate:phase0
 *
 * Or: GATE_BASE_URL=http://127.0.0.1:3001 npm run gate:phase0
 *
 * Set APP_API_SECRET in the shell (same value as web/.env.local), e.g.:
 *   export APP_API_SECRET='your-secret'
 * Or: node --env-file=.env.local ./scripts/phase0-gate.mjs  (Node 20+)
 */

const BASE = process.env.GATE_BASE_URL ?? "http://127.0.0.1:3000";
const APP_SECRET = process.env.APP_API_SECRET?.trim();

const domains = [
  "DevOps / SRE",
  "MLOps / Data Engineering",
  "Solution Architecture",
  "Financial Planning",
  "Life Strategy",
];

async function main() {
  if (!APP_SECRET) {
    console.error("Missing APP_API_SECRET (must match web/.env.local). Export it or use node --env-file=.env.local");
    process.exit(1);
  }
  let passes = 0;
  for (let i = 0; i < 5; i++) {
    let res;
    try {
      res = await fetch(`${BASE}/api/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Api-Secret": APP_SECRET,
        },
        body: JSON.stringify({
          domain: domains[i],
          userContext: `phase0-gate run ${i + 1}`,
        }),
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.error(`Request ${i + 1} failed (is the dev server running?):`, err);
      process.exit(1);
    }
    const json = await res.json().catch(() => ({}));
    const hit = res.ok && json.ok === true;
    if (hit) passes++;
    console.log(
      `${i + 1}/5`,
      res.status,
      hit ? "PASS" : "FAIL",
      hit ? "" : (json.error ?? JSON.stringify(json).slice(0, 120)),
    );
  }
  console.log(`\nPass rate: ${passes}/5 (need >= 4 for IMP-12)`);
  process.exit(passes >= 4 ? 0 : 1);
}

main();
