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

export const geopoliticsScoringPayloadSchema = scoringPayloadSchema.extend({
  stakeholderNote: z.string().min(1).max(2000),
  criteria: z.array(criterionSchema).min(4).max(12),
  options: z.array(scoringOptionSchema).min(3).max(8),
  hiddenCriteria: z.array(hiddenCriterionSchema).min(2).max(8),
});

export const evaluativeExercisePayloadSchema = z.discriminatedUnion("variant", [
  matrixPayloadSchema,
  scoringPayloadSchema,
]);

export type EvaluativeExercisePayload = z.infer<typeof evaluativeExercisePayloadSchema>;
export type GeopoliticsEvaluativePayload = z.infer<typeof geopoliticsScoringPayloadSchema>;
export type EvaluativeQuadrant = z.infer<typeof quadrantSchema>;

export function isGeopoliticsEvaluativePayload(
  data: EvaluativeExercisePayload,
): data is GeopoliticsEvaluativePayload {
  return (
    data.variant === "scoring" &&
    "stakeholderNote" in data &&
    typeof (data as GeopoliticsEvaluativePayload).stakeholderNote === "string" &&
    (data as GeopoliticsEvaluativePayload).stakeholderNote.trim().length > 0
  );
}

export const EVALUATIVE_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed validation. Return ONLY valid JSON matching the schema:
- matrix: variant "matrix", exactly 4-6 options, unique option ids, valid intendedQuadrant values.
- scoring: variant "scoring", at least 3 criteria with unique ids, each option.suggestedScores must include every criterion id with integer 1-5, at least one hiddenCriteria entry.
`;

export const GEOPOLITICS_EVALUATIVE_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed geopolitics evaluative validation. Return ONLY scoring variant JSON:
- variant must be "scoring" (not matrix)
- stakeholderNote required (primary decision-maker + 2–3 other stakeholders)
- at least 4 criteria with unique ids; descriptions name whose interest each serves
- at least 3 options with unique ids
- at least 2 hiddenCriteria
- every option.suggestedScores key must exactly match a criterion id
`;

function validateScoringSuggestedScores(
  data: z.infer<typeof scoringPayloadSchema>,
  errors: string[],
): void {
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
    for (const k of Object.keys(o.suggestedScores)) {
      if (!critIds.includes(k)) {
        errors.push(`Option ${o.id} has unknown suggestedScores key ${k}`);
      }
    }
  }
}

export function parseEvaluativeExerciseJson(
  raw: string,
): { success: true; data: EvaluativeExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { success: false, error: "Response was not valid JSON" };
  }
  if (typeof parsed === "object" && parsed !== null) {
    const rec = parsed as Record<string, unknown>;
    if (rec.variant === "scoring" && typeof rec.stakeholderNote === "string") {
      const geo = geopoliticsScoringPayloadSchema.safeParse(parsed);
      if (geo.success) {
        return { success: true, data: geo.data };
      }
      return {
        success: false,
        error: geo.error.issues.map((i) => i.message).join("; "),
      };
    }
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
  } else if (!isGeopoliticsEvaluativePayload(data)) {
    validateScoringSuggestedScores(data, errors);
  }
  return errors;
}

export function validateGeopoliticsEvaluativeSemantics(
  data: EvaluativeExercisePayload,
): string[] {
  if (!isGeopoliticsEvaluativePayload(data)) {
    return ["Geopolitics evaluative payload requires variant scoring and stakeholderNote"];
  }
  const errors: string[] = [];
  if (data.variant !== "scoring") {
    errors.push('Geopolitics evaluative must use variant "scoring"');
    return errors;
  }
  validateScoringSuggestedScores(data, errors);
  if (!data.stakeholderNote.trim()) {
    errors.push("stakeholderNote must be non-empty");
  }
  if (data.criteria.length < 4) {
    errors.push("Geopolitics evaluative requires at least 4 criteria");
  }
  if (data.options.length < 3) {
    errors.push("Geopolitics evaluative requires at least 3 options");
  }
  if (data.hiddenCriteria.length < 2) {
    errors.push("Geopolitics evaluative requires at least 2 hiddenCriteria");
  }
  for (const c of data.criteria) {
    if (c.description.trim().length < 20) {
      errors.push(`Criterion ${c.id} description should name whose interest it serves`);
    }
  }
  return errors;
}
