import { z } from "zod";

export type EvaluativeTaskType = "auto" | "dealbreaker" | "uncertainty";

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

const criteriaCandidatesSchema = z.array(z.string().min(1).max(40)).min(6).max(10).optional();

const matrixPayloadSchema = z.object({
  variant: z.literal("matrix"),
  title: z.string().min(1).max(200),
  scenario: z.string().min(1).max(4000),
  axisX: axisSchema,
  axisY: axisSchema,
  options: z.array(matrixOptionSchema).min(4).max(6),
  criteriaCandidates: criteriaCandidatesSchema,
});

const criterionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  isDealbreaker: z.boolean().optional(),
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
  criteriaCandidates: criteriaCandidatesSchema,
});

const stakeholderCandidatesSchema = z.array(z.string().min(1).max(40)).min(6).max(10).optional();

export const geopoliticsScoringPayloadSchema = scoringPayloadSchema.extend({
  stakeholderNote: z.string().min(1).max(2000),
  stakeholderCandidates: stakeholderCandidatesSchema,
  criteria: z.array(criterionSchema).min(4).max(12),
  options: z.array(scoringOptionSchema).min(3).max(8),
  hiddenCriteria: z.array(hiddenCriterionSchema).min(2).max(8),
});

const EVALUATIVE_UNCERTAINTY_PROBABILITY_EPSILON = 0.02;

const uncertaintyOutcomeSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(120),
  probability: z.number().min(0).max(1),
  payoff: z.number().finite(),
  explanation: z.string().min(1).max(600),
});

const uncertaintyOptionSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
  outcomes: z.array(uncertaintyOutcomeSchema).min(2).max(5),
});

const uncertaintyPayloadSchema = z.object({
  variant: z.literal("uncertainty"),
  title: z.string().min(1).max(200),
  scenario: z.string().min(1).max(4000),
  options: z.array(uncertaintyOptionSchema).min(2).max(5),
});

export const evaluativeExercisePayloadSchema = z.discriminatedUnion("variant", [
  matrixPayloadSchema,
  scoringPayloadSchema,
  uncertaintyPayloadSchema,
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
- both variants: criteriaCandidates must be 6-10 short (<=40 char) unique candidate criterion-name strings the user could pick from when proposing their own criteria.
`;

export const GEOPOLITICS_EVALUATIVE_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed geopolitics evaluative validation. Return ONLY scoring variant JSON:
- variant must be "scoring" (not matrix)
- stakeholderNote required (primary decision-maker + 2–3 other stakeholders)
- at least 4 criteria with unique ids; descriptions name whose interest each serves
- at least 3 options with unique ids
- at least 2 hiddenCriteria
- every option.suggestedScores key must exactly match a criterion id
- criteriaCandidates: 6-10 short (<=40 char) unique candidate criterion-name strings
- stakeholderCandidates: 6-10 short (<=40 char) unique candidate actor/stakeholder-name strings
`;

export const EVALUATIVE_DEALBREAKER_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed dealbreaker validation. Return ONLY scoring variant JSON:
- variant must be "scoring"
- at least one criterion must have isDealbreaker: true
- every option.suggestedScores key must exactly match a criterion id
`;

export const EVALUATIVE_UNCERTAINTY_RETRY_SUFFIX = `

IMPORTANT: Your previous JSON failed uncertainty validation. Return ONLY uncertainty variant JSON:
- variant must be "uncertainty"
- 2-5 options, each with 2-5 outcomes with unique ids
- each option's outcome probabilities must sum to 1.0 (within ${EVALUATIVE_UNCERTAINTY_PROBABILITY_EPSILON})
- probability must be between 0 and 1; payoff must be a finite number
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

function validateUncertaintyOutcomes(
  data: z.infer<typeof uncertaintyPayloadSchema>,
  errors: string[],
): void {
  const optIds = data.options.map((o) => o.id);
  if (new Set(optIds).size !== optIds.length) errors.push("Option ids must be unique");
  for (const o of data.options) {
    const outIds = o.outcomes.map((out) => out.id);
    if (new Set(outIds).size !== outIds.length) {
      errors.push(`Option ${o.id} outcome ids must be unique`);
    }
    const sum = o.outcomes.reduce((s, out) => s + out.probability, 0);
    if (Math.abs(sum - 1) > EVALUATIVE_UNCERTAINTY_PROBABILITY_EPSILON) {
      errors.push(`Option ${o.id} outcome probabilities must sum to 1.0 (got ${sum})`);
    }
  }
}

function validateCriteriaCandidates(candidates: string[] | undefined, errors: string[]): void {
  if (!candidates) return;
  const normalized = candidates.map((c) => c.trim().toLowerCase());
  if (new Set(normalized).size !== normalized.length) {
    errors.push("criteriaCandidates must not contain duplicates");
  }
  if (candidates.some((c) => !c.trim())) {
    errors.push("criteriaCandidates entries must be non-empty");
  }
}

export function validateEvaluativeSemantics(data: EvaluativeExercisePayload): string[] {
  const errors: string[] = [];
  if (data.variant === "matrix") {
    const ids = data.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) errors.push("Matrix options must have unique ids");
    validateCriteriaCandidates(data.criteriaCandidates, errors);
  } else if (data.variant === "uncertainty") {
    validateUncertaintyOutcomes(data, errors);
  } else {
    validateCriteriaCandidates(data.criteriaCandidates, errors);
    if (!isGeopoliticsEvaluativePayload(data)) {
      validateScoringSuggestedScores(data, errors);
    }
  }
  return errors;
}

export function validateEvaluativeDealbreakerSemantics(data: EvaluativeExercisePayload): string[] {
  if (data.variant !== "scoring") {
    return ['Dealbreaker evaluative must use variant "scoring"'];
  }
  const errors: string[] = [];
  validateScoringSuggestedScores(data, errors);
  if (!data.criteria.some((c) => c.isDealbreaker === true)) {
    errors.push("At least one criterion must have isDealbreaker: true");
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
  validateCriteriaCandidates(data.stakeholderCandidates, errors);
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
