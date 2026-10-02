import { z } from "zod";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import type {
  AIPerspectiveStructured,
  AnalyticalCoachingStructured,
  ClarityPerspectiveStructured,
  LegacyPerspectiveStructured,
} from "@/lib/types/perspective";

const suitableForSchema = z
  .string()
  .min(1)
  .refine((s) => s.startsWith("Suitable for "), {
    message: 'suitableFor must start with "Suitable for "',
  });

const openQuestionsSchema = z.array(z.string().min(1)).min(1).max(5).optional();

const clarityBaseSchema = z.object({
  perspectiveFormat: z.literal("clarity_v2"),
  title: z.string().min(1),
  suitableFor: suitableForSchema,
  openQuestions: openQuestionsSchema,
});

const highlightCritiqueSchema = z.object({
  id: z.string().optional(),
  userTextSnippet: z.string().min(1),
  critique: z.string().min(1),
  remediationAlternative: z.string().min(1),
});

const nodeCritiqueSchema = z.object({
  nodeId: z.string().min(1),
  nodeLabel: z.string().min(1),
  userImpact: z.enum(["none", "direct", "indirect"]),
  userContextSnippet: z.string(),
  critique: z.string().min(1),
  remediationAlternative: z.string().min(1),
});

const placementCritiqueSchema = z.object({
  optionId: z.string().min(1),
  optionTitle: z.string().min(1),
  userQuadrant: z.string().min(1),
  userValueContext: z.string().min(1),
  aiEvaluationText: z.string().min(1),
});

const criterionCritiqueSchema = z.object({
  criterionId: z.string().min(1),
  criterionLabel: z.string().min(1),
  userAssignedWeight: z.number(),
  userValueContext: z.string().min(1),
  aiEvaluationText: z.string().min(1),
});

const outcomeCritiqueSchema = z.object({
  optionId: z.string().min(1),
  optionTitle: z.string().min(1),
  userImpliedEv: z.number().nullable(),
  aiEv: z.number().nullable(),
  critique: z.string().min(1),
});

export const analyticalPerspectiveSchema = clarityBaseSchema.extend({
  highlightCritiques: z.array(highlightCritiqueSchema).min(1),
});

export const systemsPerspectiveSchema = clarityBaseSchema.extend({
  nodeCritiques: z.array(nodeCritiqueSchema).min(1),
});

export const evaluativeMatrixPerspectiveSchema = clarityBaseSchema.extend({
  placementCritiques: z.array(placementCritiqueSchema).min(1),
});

export const evaluativeScoringPerspectiveSchema = clarityBaseSchema.extend({
  critiqueMatrix: z.array(criterionCritiqueSchema).min(1),
});

export const evaluativeUncertaintyPerspectiveSchema = clarityBaseSchema.extend({
  outcomeCritiques: z.array(outcomeCritiqueSchema).min(1),
});

const perspectivePointSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  body: z.string().min(1),
});

export const legacyPerspectiveStructuredSchema = z.object({
  embedded: z.array(perspectivePointSchema).min(1),
  userFound: z.array(perspectivePointSchema),
  additional: z.array(perspectivePointSchema).min(1),
  openQuestions: z.array(perspectivePointSchema).min(1),
});

const coachingItemSchema = z.object({
  ref: z.string().min(1),
  why: z.string().min(1),
  clue: z.string().min(1),
  nextTimeAsk: z.string().min(1),
  subtypeName: z.string().min(1).optional(),
});

export const analyticalCoachingSchema = z.object({
  perspectiveFormat: z.literal("analytical_v3"),
  title: z.string().min(1),
  items: z.array(coachingItemSchema),
  takeaways: z.array(z.string().min(1)).min(1).max(2),
  metaNote: z.string().min(1).optional(),
});

export type ParseAnalyticalCoachingResult =
  | { success: true; data: AnalyticalCoachingStructured }
  | { success: false; error: string };

/**
 * Parse analytical v3 feedback and check it covers every case the code asked about.
 * Items for refs nobody asked about are dropped rather than failing the reply.
 */
export function parseAnalyticalCoachingJson(
  text: string,
  opts: { requiredRefs: string[]; allowedRefs: string[]; requireMetaNote?: boolean },
): ParseAnalyticalCoachingResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = analyticalCoachingSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  const allowed = new Set(opts.allowedRefs);
  const seen = new Set<string>();
  const items = result.data.items.filter((it) => {
    if (!allowed.has(it.ref) || seen.has(it.ref)) return false;
    seen.add(it.ref);
    return true;
  });
  const missing = opts.requiredRefs.filter((r) => !seen.has(r));
  if (missing.length > 0) {
    return { success: false, error: `items missing for refs: ${missing.join(", ")}` };
  }
  if (opts.requireMetaNote && !result.data.metaNote) {
    return { success: false, error: "metaNote is required for geopolitics passages" };
  }
  // Keep the answer-key order, whatever order the model used.
  const order = new Map(opts.allowedRefs.map((r, i) => [r, i]));
  items.sort((a, b) => order.get(a.ref)! - order.get(b.ref)!);
  return { success: true, data: { ...result.data, items } as AnalyticalCoachingStructured };
}

export const ANALYTICAL_COACHING_RETRY_SUFFIX = `Your previous answer was not valid JSON or did not match the required shape.
Return ONLY a single JSON object (no markdown fences) with perspectiveFormat: "analytical_v3", title, items[{ ref, why, clue, nextTimeAsk, subtypeName? }] with one item for every ref listed under CASES, and takeaways (1-2 strings).`;

/** @deprecated Use kind-specific clarity schemas; kept for generic checks. */
export const aiPerspectiveStructuredSchema = z.union([
  analyticalCoachingSchema,
  analyticalPerspectiveSchema,
  systemsPerspectiveSchema,
  evaluativeMatrixPerspectiveSchema,
  evaluativeScoringPerspectiveSchema,
  evaluativeUncertaintyPerspectiveSchema,
  legacyPerspectiveStructuredSchema,
]);

function schemaForKind(kind: ClarityPerspectiveKind) {
  switch (kind) {
    case "analytical":
      return analyticalPerspectiveSchema;
    case "systems":
      return systemsPerspectiveSchema;
    case "evaluative-matrix":
      return evaluativeMatrixPerspectiveSchema;
    case "evaluative-scoring":
      return evaluativeScoringPerspectiveSchema;
    case "evaluative-uncertainty":
      return evaluativeUncertaintyPerspectiveSchema;
  }
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

export type ParseStructuredPerspectiveResult =
  | { success: true; data: AIPerspectiveStructured; format: "clarity_v2" | "legacy" }
  | { success: false; error: string };

export function parseStructuredPerspectiveJson(
  text: string,
  kind: ClarityPerspectiveKind,
): ParseStructuredPerspectiveResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }

  const clarityResult = schemaForKind(kind).safeParse(parsed);
  if (clarityResult.success) {
    return {
      success: true,
      data: clarityResult.data as ClarityPerspectiveStructured,
      format: "clarity_v2",
    };
  }

  const legacyResult = legacyPerspectiveStructuredSchema.safeParse(parsed);
  if (legacyResult.success) {
    return {
      success: true,
      data: legacyResult.data as LegacyPerspectiveStructured,
      format: "legacy",
    };
  }

  const clarityErr = clarityResult.error.issues.map((i) => i.message).join("; ");
  const legacyErr = legacyResult.error.issues.map((i) => i.message).join("; ");
  return {
    success: false,
    error: `Clarity v2: ${clarityErr}. Legacy: ${legacyErr}`,
  };
}

export function structuredPerspectiveRetrySuffix(kind: ClarityPerspectiveKind): string {
  const base = `Your previous answer was not valid JSON or did not match the required schema.
Return ONLY a single JSON object (no markdown fences) with perspectiveFormat: "clarity_v2".`;

  switch (kind) {
    case "analytical":
      return `${base}
Required keys: title, suitableFor (starts with "Suitable for "), highlightCritiques[{ userTextSnippet, critique, remediationAlternative }], optional openQuestions (string[]).`;
    case "systems":
      return `${base}
Required keys: title, suitableFor, nodeCritiques[{ nodeId, nodeLabel, userImpact, userContextSnippet, critique, remediationAlternative }], optional openQuestions.`;
    case "evaluative-matrix":
      return `${base}
Required keys: title, suitableFor, placementCritiques[{ optionId, optionTitle, userQuadrant, userValueContext, aiEvaluationText }], optional openQuestions.`;
    case "evaluative-scoring":
      return `${base}
Required keys: title, suitableFor, critiqueMatrix[{ criterionId, criterionLabel, userAssignedWeight, userValueContext, aiEvaluationText }], optional openQuestions.`;
    case "evaluative-uncertainty":
      return `${base}
Required keys: title, suitableFor, outcomeCritiques[{ optionId, optionTitle, userImpliedEv, aiEv, critique }], optional openQuestions.`;
  }
}

/** @deprecated Use structuredPerspectiveRetrySuffix(kind) */
export const STRUCTURED_PERSPECTIVE_RETRY_SUFFIX = `Your previous answer was not valid JSON or did not match the required schema.
Return ONLY a single JSON object (no markdown fences) with perspectiveFormat: "clarity_v2", title, suitableFor, and the kind-specific critique array.`;
