/**
 * Drafts ONE new scenario via the model and writes it, UNVERIFIED, to
 * src/lib/scenarios/drafts/ — never into the live registry.
 *
 * Run: npm run scenarios:author
 *
 * Uses relative imports (not the "@/..." tsconfig alias) so this script resolves
 * correctly under `npx tsx` without depending on alias support in the runner.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { generateAnalyticalExerciseRaw } from "../src/lib/ai/gemini";
import {
  buildScenarioAuthoringPrompt,
  type ExistingReasoningMove,
} from "../src/lib/ai/prompts/scenario-authoring";
import { scenarioObjectSchema } from "../src/lib/scenarios/scenario-schema";
import { auditScenarioDraft } from "../src/lib/scenarios/audit-draft";
import { expectedValueScenarios } from "../src/lib/scenarios/expected-value";
import { promotedScenarios } from "../src/lib/scenarios/promoted";
import { NOT_IMPLEMENTED_SENTINEL } from "../src/lib/scenarios/promotion-gate";
import type { Scenario } from "../src/lib/types/math-scenario";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, "..");
const draftsDir = join(projectRoot, "src/lib/scenarios/drafts");

function loadEnvLocal(): void {
  const envPath = join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const draftResponseSchema = scenarioObjectSchema.extend({ notes: z.string().optional() });

async function main(): Promise<void> {
  loadEnvLocal();
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("GEMINI_API_KEY is not set (checked process.env and .env.local). Aborting.");
    process.exit(1);
  }

  const existing = [...expectedValueScenarios, ...promotedScenarios];
  const existingMoves: ExistingReasoningMove[] = existing.map((s) => ({
    toolName: s.toolName,
    topic: s.topic,
    reasoningMove: s.fieldNote,
  }));

  const prompt = buildScenarioAuthoringPrompt(existingMoves);
  console.log(`Requesting a draft scenario from the model (${existing.length} existing reasoning moves fed as anti-clone context)...`);

  const raw = await generateAnalyticalExerciseRaw(prompt, "thinking");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error("Model did not return valid JSON. First 500 chars:\n" + raw.slice(0, 500));
    process.exit(1);
  }

  const parsed = draftResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error("Draft failed schema validation:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const { notes, ...rest } = parsed.data;
  const scenario = rest as Scenario;

  const audit = auditScenarioDraft(scenario, existing);
  if (!audit.pass) {
    console.error(`Draft "${scenario.id}" failed the automated audit and will NOT be written to disk:`);
    for (const f of audit.failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  const draftPath = join(draftsDir, `${scenario.id}.ts`);
  if (existsSync(draftPath)) {
    console.error(`A draft with id "${scenario.id}" already exists at ${draftPath}. Aborting to avoid overwriting.`);
    process.exit(1);
  }

  const draftFile = `import type { Scenario } from "@/lib/types/math-scenario";

/**
 * UNVERIFIED AI DRAFT — never imported by the app. See ../drafts/README.md.
 * This scenario is invisible to learners until a human runs:
 *   npm run scenarios:promote -- ${scenario.id} --confirm
 * and that script's gate (verifier + audit + explicit confirmation) passes.
 *
 * Reviewer notes from the drafting model:
 * ${(notes ?? "(none provided)").split("\n").join("\n * ")}
 */
export const draft: Scenario = ${JSON.stringify(scenario, null, 2)};
`;
  writeFileSync(draftPath, draftFile, "utf8");

  const verifierPath = join(draftsDir, `${scenario.id}.verify.test.ts`);
  // The sentinel is embedded as a literal string (not imported by name) because
  // scripts/promote-scenario.ts detects an unfilled stub via a raw text search for this
  // exact value in the file - referencing the constant by identifier would not match.
  const verifierStub = `import { describe, it } from "vitest";

// TODO(human): write a Monte Carlo (or independently-derived closed-form) verification that
// drafts/${scenario.id}.ts's canonicalAnswer / commitSpec target is actually correct, by
// simulating the situation and comparing an empirical result to the drafted answer within a
// stated tolerance — mirroring src/lib/scenarios/expected-value.test.ts's VoI simulation.
//
// This verifier must NOT be written by the same model that drafted the scenario: an AI
// grading its own drafted answer proves nothing. A human writes or reviews this file.
//
// Delete this placeholder once a real assertion exists. Until then, promotion stays
// blocked (scripts/promote-scenario.ts refuses while the sentinel below is present).
describe("${scenario.id} verifier (STUB — not yet implemented)", () => {
  it("has not been verified yet", () => {
    throw new Error(${JSON.stringify(NOT_IMPLEMENTED_SENTINEL)});
  });
});
`;
  writeFileSync(verifierPath, verifierStub, "utf8");

  console.log(`\nDraft written (NOT live): src/lib/scenarios/drafts/${scenario.id}.ts`);
  console.log(`Verifier stub written: src/lib/scenarios/drafts/${scenario.id}.verify.test.ts`);
  console.log(`\nNext steps for a human reviewer:`);
  console.log(`  1. Read the draft and its "notes" field for the model's stated reasoning move.`);
  console.log(`  2. Implement and pass the verifier test above.`);
  console.log(`  3. Run: npm run scenarios:promote -- ${scenario.id} --confirm`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
