import { z } from "zod";

const criticalErrorSeveritySchema = z.enum([
  "catastrophic",
  "problematic",
  "suboptimal",
]);

const criticalErrorSchema = z.object({
  description: z.string(),
  severity: criticalErrorSeveritySchema,
});

const stepSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  correctPosition: z.number().int().nonnegative(),
  dependencies: z.array(z.string()),
  isFlexible: z.boolean(),
  explanation: z.string(),
});

/** Phase 2.3 in repo ai_plan.txt */
export const sequentialExerciseSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  steps: z.array(stepSchema).min(6).max(10),
  criticalErrors: z.array(criticalErrorSchema).min(1),
});

export type SequentialExercisePayload = z.infer<typeof sequentialExerciseSchema>;

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

export type ParseSequentialResult =
  | { success: true; data: SequentialExercisePayload }
  | { success: false; error: string };

export function parseSequentialExerciseJson(text: string): ParseSequentialResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = sequentialExerciseSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((i) => i.message).join("; "),
    };
  }
  return { success: true, data: result.data };
}
