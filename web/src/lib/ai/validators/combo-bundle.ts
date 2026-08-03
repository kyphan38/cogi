import { z } from "zod";
import { analyticalExerciseSchema } from "@/lib/ai/validators/common";
import { evaluativeExercisePayloadSchema } from "@/lib/ai/validators/evaluative";
import { generativeExercisePayloadSchema } from "@/lib/ai/validators/generative";
import {
  sequentialExerciseSchema,
  sequentialGeopoliticsExerciseSchema,
} from "@/lib/ai/validators/sequential";
import {
  sanitizeSystemsNodesInPlace,
  systemsExerciseSchema,
  systemsGeopoliticsExerciseSchema,
} from "@/lib/ai/validators/systems";
import type { ComboPresetId } from "@/lib/types/exercise";

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

const matrixOnly = evaluativeExercisePayloadSchema.refine(
  (v): v is Extract<z.infer<typeof evaluativeExercisePayloadSchema>, { variant: "matrix" }> =>
    v.variant === "matrix",
  { message: "evaluative must be matrix variant" },
);

const uncertaintyOnly = evaluativeExercisePayloadSchema.refine(
  (v): v is Extract<z.infer<typeof evaluativeExercisePayloadSchema>, { variant: "uncertainty" }> =>
    v.variant === "uncertainty",
  { message: "evaluative must be uncertainty variant" },
);

/**
 * Geopolitics-domain auto-detection (§2a) reuses the same node/edge schema but with extra
 * required perspective-B fields, so systems/sequential accept EITHER shape here - the geopolitics
 * schema is tried first so its extra fields survive parsing when the model returns them.
 */
const systemsAnyVariant = z.union([systemsGeopoliticsExerciseSchema, systemsExerciseSchema]);
const sequentialAnyVariant = z.union([
  sequentialGeopoliticsExerciseSchema,
  sequentialExerciseSchema,
]);

const fullAnalysisSchema = z.object({
  preset: z.literal("full_analysis"),
  sharedTitle: z.string().min(1),
  sharedScenario: z.string().min(20),
  analytical: analyticalExerciseSchema,
  systems: systemsAnyVariant,
  evaluativeMatrix: matrixOnly,
});

const decisionSprintSchema = z.object({
  preset: z.literal("decision_sprint"),
  sharedTitle: z.string().min(1),
  sharedScenario: z.string().min(20),
  evaluativeMatrix: matrixOnly,
  generative: generativeExercisePayloadSchema,
});

const rootCauseSchema = z.object({
  preset: z.literal("root_cause"),
  sharedTitle: z.string().min(1),
  sharedScenario: z.string().min(20),
  sequential: sequentialAnyVariant,
  systems: systemsAnyVariant,
  analytical: analyticalExerciseSchema,
});

/**
 * `perspectiveAName`/`perspectiveBName` are hoisted to the bundle's shared top level (the prompt
 * treats these as the single source of truth for both actor names) and cross-checked below against
 * each sub-schema's own copy, rather than stripping the name fields out of the reused geopolitics
 * sub-schemas - this keeps `combo.ts`'s prompt able to reuse the standalone geopolitics prompt
 * wording verbatim (which already asks for perspectiveAName/perspectiveBName per sub-exercise).
 */
const crisisResponseSchema = z
  .object({
    preset: z.literal("crisis_response"),
    sharedTitle: z.string().min(1),
    sharedScenario: z.string().min(20),
    perspectiveAName: z.string().min(1),
    perspectiveBName: z.string().min(1),
    sequential: sequentialGeopoliticsExerciseSchema,
    systems: systemsGeopoliticsExerciseSchema,
    evaluativeUncertainty: uncertaintyOnly,
  })
  .superRefine((data, ctx) => {
    if (data.sequential.perspectiveAName !== data.perspectiveAName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sequential.perspectiveAName must match the shared perspectiveAName",
        path: ["sequential", "perspectiveAName"],
      });
    }
    if (data.sequential.perspectiveBName !== data.perspectiveBName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sequential.perspectiveBName must match the shared perspectiveBName",
        path: ["sequential", "perspectiveBName"],
      });
    }
    if (data.systems.perspectiveAName !== data.perspectiveAName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "systems.perspectiveAName must match the shared perspectiveAName",
        path: ["systems", "perspectiveAName"],
      });
    }
    if (data.systems.perspectiveBName !== data.perspectiveBName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "systems.perspectiveBName must match the shared perspectiveBName",
        path: ["systems", "perspectiveBName"],
      });
    }
  });

export type ComboFullAnalysisBundle = z.infer<typeof fullAnalysisSchema>;
export type ComboDecisionSprintBundle = z.infer<typeof decisionSprintSchema>;
export type ComboRootCauseBundle = z.infer<typeof rootCauseSchema>;
export type ComboCrisisResponseBundle = z.infer<typeof crisisResponseSchema>;

export type ComboBundle =
  | ComboFullAnalysisBundle
  | ComboDecisionSprintBundle
  | ComboRootCauseBundle
  | ComboCrisisResponseBundle;

export type ParseComboBundleResult =
  | { success: true; data: ComboBundle }
  | { success: false; error: string };

export function parseComboBundleJson(raw: string, preset: ComboPresetId): ParseComboBundleResult {
  const stripped = stripJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "Invalid combo payload" };
  }
  const p = (parsed as { preset?: string }).preset;
  if (p !== preset) {
    return { success: false, error: `Expected preset "${preset}", got "${String(p)}"` };
  }
  if (preset === "full_analysis") {
    const o = parsed as Record<string, unknown>;
    if (o.systems && typeof o.systems === "object") {
      sanitizeSystemsNodesInPlace(o.systems);
    }
    const r = fullAnalysisSchema.safeParse(parsed);
    if (!r.success) {
      return { success: false, error: r.error.issues.map((i) => i.message).join("; ") };
    }
    return { success: true, data: r.data };
  }
  if (preset === "decision_sprint") {
    const r = decisionSprintSchema.safeParse(parsed);
    if (!r.success) {
      return { success: false, error: r.error.issues.map((i) => i.message).join("; ") };
    }
    return { success: true, data: r.data };
  }
  if (preset === "root_cause") {
    const rc = parsed as Record<string, unknown>;
    if (rc.systems && typeof rc.systems === "object") {
      sanitizeSystemsNodesInPlace(rc.systems);
    }
    const r = rootCauseSchema.safeParse(parsed);
    if (!r.success) {
      return { success: false, error: r.error.issues.map((i) => i.message).join("; ") };
    }
    return { success: true, data: r.data };
  }
  const cr = parsed as Record<string, unknown>;
  if (cr.systems && typeof cr.systems === "object") {
    sanitizeSystemsNodesInPlace(cr.systems);
  }
  const r = crisisResponseSchema.safeParse(parsed);
  if (!r.success) {
    return { success: false, error: r.error.issues.map((i) => i.message).join("; ") };
  }
  return { success: true, data: r.data };
}
