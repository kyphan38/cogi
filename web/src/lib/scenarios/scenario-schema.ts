import { z } from "zod";
import type { Scenario } from "@/lib/types/math-scenario";

const topicSchema = z.enum([
  "expected_value",
  "graph_theory",
  "game_theory",
  "probability_bayes",
  "causal_literacy",
  "exponential_power_law",
]);

const optionSpecSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const commitSpecSchema = z.object({
  kind: z.enum(["numeric", "multiple_choice", "ranged_estimate"]),
  promptText: z.string().min(1),
  unit: z.string().optional(),
  targetValue: z.number().optional(),
  tolerance: z.number().optional(),
  acceptableRange: z.tuple([z.number(), z.number()]).optional(),
  correctOptionId: z.string().optional(),
  options: z.array(optionSpecSchema).optional(),
});

const transferSchema = z.object({
  domain: z.string().min(1),
  mapping: z.string().min(1),
});

const boundarySchema = z.object({
  condition: z.string().min(1),
  whyItBreaks: z.string().min(1),
});

const verificationSchema = z.object({
  scriptPath: z.string().min(1),
  expected: z.number(),
  tolerance: z.number(),
});

/**
 * Mirrors src/lib/types/math-scenario.ts's Scenario interface. Used to validate
 * AI-drafted JSON before it is ever written to disk under drafts/ - malformed
 * or incomplete drafts are rejected here, before the audit or verifier ever run.
 *
 * Exported as the raw object schema (not cast to z.ZodType<Scenario>) so callers such as
 * the authoring script can `.extend()` it with reviewer-only fields (e.g. "notes") that
 * are stripped before the draft is treated as a real Scenario.
 */
export const scenarioObjectSchema = z.object({
  id: z.string().min(1),
  topic: topicSchema,
  title: z.string().min(1),
  situation: z.string().min(1),
  commitSpec: commitSpecSchema,
  keyTraps: z.array(z.string().min(1)).min(1),
  hintLadder: z.array(z.string().min(1)).min(1),
  canonicalAnswer: z.string().min(1),
  explanation: z.string().min(1),
  toolName: z.string().min(1),
  transfers: z.array(transferSchema).min(1),
  boundaries: z.array(boundarySchema).min(1),
  verification: verificationSchema.optional(),
  fieldNote: z.string().min(1),
});

export const scenarioSchema: z.ZodType<Scenario> = scenarioObjectSchema as z.ZodType<Scenario>;

export function parseScenarioDraft(raw: string): Scenario | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = scenarioSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
