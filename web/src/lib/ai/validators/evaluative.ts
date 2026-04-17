import { z } from "zod";

const quadrantSchema = z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]);

const axisSchema = z.object({
  label: z.string().min(1).max(80),
  lowLabel: z.string().min(1).max(40),
  highLabel: z.string().min(1).max(40),
});

const matrixOptionSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  intendedQuadrant: quadrantSchema,
  explanation: z.string().min(1).max(600),
});

const matrixPayloadSchema = z.object({
  variant: z.literal("matrix"),
  title: z.string().min(1).max(200),
  scenario: z.string().min(1).max(4000),
  axisX: axisSchema,
  axisY: axisSchema,
  options: z.array(matrixOptionSchema).min(4).max(6),
});

const criterionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  suggestedWeight: z.number().int().min(1).max(5),
});

const scoringOptionSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  suggestedScores: z.record(z.string(), z.number().int().min(1).max(5)),
  explanation: z.string().min(1).max(600),
});

const hiddenCriterionSchema = z.object({
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
});

const scoringPayloadSchema = z.object({
  variant: z.literal("scoring"),
  title: z.string().min(1).max(200),
  scenario: z.string().min(1).max(4000),
  criteria: z.array(criterionSchema).min(3).max(12),
  options: z.array(scoringOptionSchema).min(2).max(8),
  hiddenCriteria: z.array(hiddenCriterionSchema).min(1).max(8),
});

export const evaluativeExercisePayloadSchema = z.discriminatedUnion("variant", [
  matrixPayloadSchema,
  scoringPayloadSchema,
]);

export type EvaluativeExercisePayload = z.infer<typeof evaluativeExercisePayloadSchema>;
export type EvaluativeQuadrant = z.infer<typeof quadrantSchema>;

export const EVALUATIVE_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed validation. Return ONLY valid JSON matching the schema:
- matrix: variant "matrix", exactly 4-6 options, unique option ids, valid intendedQuadrant values.
- scoring: variant "scoring", at least 3 criteria with unique ids, each option.suggestedScores must include every criterion id with integer 1-5, at least one hiddenCriteria entry.
`;

export function parseEvaluativeExerciseJson(
  raw: string,
): { success: true; data: EvaluativeExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { success: false, error: "Response was not valid JSON" };
  }
  const r = evaluativeExercisePayloadSchema.safeParse(parsed);
  if (!r.success) {
    return { success: false, error: r.error.issues.map((i) => i.message).join("; ") };
  }
  return { success: true, data: r.data };
}

export function validateEvaluativeSemantics(data: EvaluativeExercisePayload): string[] {
  const errors: string[] = [];
  if (data.variant === "matrix") {
    const ids = data.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) errors.push("Matrix options must have unique ids");
  } else {
    const critIds = data.criteria.map((c) => c.id);
    if (new Set(critIds).size !== critIds.length) errors.push("Criteria ids must be unique");
    const optIds = data.options.map((o) => o.id);
    if (new Set(optIds).size !== optIds.length) errors.push("Option ids must be unique");
    for (const o of data.options) {
      for (const cid of critIds) {
        if (o.suggestedScores[cid] === undefined) {
          errors.push(`Option ${o.id} missing suggestedScores for criterion ${cid}`);
        }
      }
      const keys = Object.keys(o.suggestedScores);
      for (const k of keys) {
        if (!critIds.includes(k)) {
          errors.push(`Option ${o.id} has unknown suggestedScores key ${k}`);
        }
      }
    }
  }
  return errors;
}
