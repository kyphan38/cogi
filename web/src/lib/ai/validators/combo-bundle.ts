import { z } from "zod";
import { analyticalExerciseSchema } from "@/lib/ai/validators/common";
import { evaluativeExercisePayloadSchema } from "@/lib/ai/validators/evaluative";
import { generativeExercisePayloadSchema } from "@/lib/ai/validators/generative";
import { sequentialExerciseSchema } from "@/lib/ai/validators/sequential";
import {
  sanitizeSystemsNodesInPlace,
  systemsExerciseSchema,
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

const fullAnalysisSchema = z.object({
  preset: z.literal("full_analysis"),
  sharedTitle: z.string().min(1),
  sharedScenario: z.string().min(20),
  analytical: analyticalExerciseSchema,
  systems: systemsExerciseSchema,
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
  sequential: sequentialExerciseSchema,
  systems: systemsExerciseSchema,
  analytical: analyticalExerciseSchema,
});

export type ComboFullAnalysisBundle = z.infer<typeof fullAnalysisSchema>;
export type ComboDecisionSprintBundle = z.infer<typeof decisionSprintSchema>;
export type ComboRootCauseBundle = z.infer<typeof rootCauseSchema>;

export type ComboBundle =
  | ComboFullAnalysisBundle
  | ComboDecisionSprintBundle
  | ComboRootCauseBundle;

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
