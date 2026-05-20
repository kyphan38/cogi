import { z } from "zod";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";
import type {
  AIPerspectiveStructured,
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

const stepCritiqueSchema = z.object({
  phaseId: z.string().min(1),
  promptQuestion: z.string().min(1),
  userResponseSnippet: z.string().min(1),
  critique: z.string().min(1),
  remediationAlternative: z.string().min(1),
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

export const generativePerspectiveSchema = clarityBaseSchema.extend({
  stepCritiques: z.array(stepCritiqueSchema).min(1),
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

/** @deprecated Use kind-specific clarity schemas; kept for generic checks. */
export const aiPerspectiveStructuredSchema = z.union([
  analyticalPerspectiveSchema,
  systemsPerspectiveSchema,
  evaluativeMatrixPerspectiveSchema,
  evaluativeScoringPerspectiveSchema,
  generativePerspectiveSchema,
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
    case "generative":
      return generativePerspectiveSchema;
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

export function parseLegacyPerspectiveJson(text: string): ParseStructuredPerspectiveResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const legacyResult = legacyPerspectiveStructuredSchema.safeParse(parsed);
  if (legacyResult.success) {
    return {
      success: true,
      data: legacyResult.data as LegacyPerspectiveStructured,
      format: "legacy",
    };
  }
  return {
    success: false,
    error: legacyResult.error.issues.map((i) => i.message).join("; "),
  };
}

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
    case "generative":
      return `${base}
Required keys: title, suitableFor, stepCritiques[{ phaseId, promptQuestion, userResponseSnippet, critique, remediationAlternative }], optional openQuestions.`;
  }
}

/** @deprecated Use structuredPerspectiveRetrySuffix(kind) */
export const STRUCTURED_PERSPECTIVE_RETRY_SUFFIX = `Your previous answer was not valid JSON or did not match the required schema.
Return ONLY a single JSON object (no markdown fences) with perspectiveFormat: "clarity_v2", title, suitableFor, and the kind-specific critique array.`;
