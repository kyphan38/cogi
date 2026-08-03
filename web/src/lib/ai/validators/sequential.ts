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

/** Mirrors `SystemsTaskType`/`EvaluativeTaskType`: `"auto"` keeps silent domain-detection,
 * `"geopolitics"` forces the dual-actor payload, `"triage"` is the severity-weighted variant. */
export type SequentialTaskType = "auto" | "geopolitics" | "triage";

export const sequentialGeopoliticsStepSchema = stepSchema.extend({
  /** Actor B's correct position for this SAME step id - orders may legitimately differ from Actor A's. */
  correctPositionB: z.number().int().nonnegative(),
});

export const sequentialGeopoliticsExerciseSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  perspectiveAName: z.string().min(1),
  perspectiveBName: z.string().min(1),
  steps: z.array(sequentialGeopoliticsStepSchema).min(6).max(10),
  /** Errors specific to getting Actor A's order wrong. */
  criticalErrors: z.array(criticalErrorSchema).min(1),
  /** Errors specific to getting Actor B's order wrong (kept separate - different actor, different stakes). */
  criticalErrorsB: z.array(criticalErrorSchema).min(1),
});

export type SequentialGeopoliticsExercisePayload = z.infer<
  typeof sequentialGeopoliticsExerciseSchema
>;

export const triageStepSchema = stepSchema.extend({
  severity: z.enum(["critical", "major", "minor"]),
});

export const sequentialTriageExerciseSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  variantKind: z.literal("triage"),
  timeLimitMinutes: z.number().int().min(1).max(180),
  steps: z.array(triageStepSchema).min(6).max(10),
  criticalErrors: z.array(criticalErrorSchema).min(1),
});

export type SequentialTriageExercisePayload = z.infer<typeof sequentialTriageExerciseSchema>;

export type AnySequentialExercisePayload =
  | SequentialExercisePayload
  | SequentialGeopoliticsExercisePayload
  | SequentialTriageExercisePayload;

export function isGeopoliticsSequentialPayload(
  data: AnySequentialExercisePayload,
): data is SequentialGeopoliticsExercisePayload {
  return (
    "perspectiveAName" in data &&
    typeof (data as SequentialGeopoliticsExercisePayload).perspectiveAName === "string" &&
    (data as SequentialGeopoliticsExercisePayload).perspectiveAName.trim().length > 0
  );
}

export function isTriageSequentialPayload(
  data: AnySequentialExercisePayload,
): data is SequentialTriageExercisePayload {
  return (
    "variantKind" in data &&
    (data as SequentialTriageExercisePayload).variantKind === "triage"
  );
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (m?.[1]) return m[1].trim();
  return trimmed;
}

function looksLikeTriageSequentialRaw(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  return (parsed as Record<string, unknown>).variantKind === "triage";
}

function looksLikeGeopoliticsSequentialRaw(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const o = parsed as Record<string, unknown>;
  return (
    typeof o.perspectiveAName === "string" ||
    typeof o.perspectiveBName === "string" ||
    Array.isArray(o.criticalErrorsB)
  );
}

export type ParseSequentialResult =
  | { success: true; data: AnySequentialExercisePayload }
  | { success: false; error: string };

export function parseSequentialExerciseJson(text: string): ParseSequentialResult {
  const stripped = stripJsonFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }

  if (looksLikeTriageSequentialRaw(parsed)) {
    const triage = sequentialTriageExerciseSchema.safeParse(parsed);
    if (triage.success) {
      return { success: true, data: triage.data };
    }
    return {
      success: false,
      error: triage.error.issues.map((i) => i.message).join("; "),
    };
  }

  if (looksLikeGeopoliticsSequentialRaw(parsed)) {
    const geo = sequentialGeopoliticsExerciseSchema.safeParse(parsed);
    if (geo.success) {
      return { success: true, data: geo.data };
    }
    return {
      success: false,
      error: geo.error.issues.map((i) => i.message).join("; "),
    };
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

function permutationErrors(values: number[], n: number, label: string): string[] {
  const errors: string[] = [];
  if (values.length !== n) {
    errors.push(`${label} must have exactly ${n} entries`);
    return errors;
  }
  const set = new Set(values);
  if (set.size !== n) {
    errors.push(`${label} values must be unique`);
  }
  for (let i = 0; i < n; i++) {
    if (!set.has(i)) {
      errors.push(`${label} is missing position ${i}`);
    }
  }
  return errors;
}

function hasDependencyCycle(steps: { id: string; dependencies: string[] }[]): boolean {
  const idSet = new Set(steps.map((s) => s.id));
  const adj = new Map(steps.map((s) => [s.id, s.dependencies] as const));
  const visited = new Set<string>();
  const stack = new Set<string>();

  const dfs = (node: string): boolean => {
    visited.add(node);
    stack.add(node);
    for (const dep of adj.get(node) ?? []) {
      if (!idSet.has(dep)) continue;
      if (!visited.has(dep)) {
        if (dfs(dep)) return true;
      } else if (stack.has(dep)) {
        return true;
      }
    }
    stack.delete(node);
    return false;
  };

  for (const s of steps) {
    if (!visited.has(s.id) && dfs(s.id)) return true;
  }
  return false;
}

/** Dual-actor semantics: both orderings must be valid permutations over the SAME step id set,
 * with distinct actor names and a non-empty, separate critical-error set for Actor B. */
export function validateGeopoliticsSequentialSemantics(
  data: SequentialGeopoliticsExercisePayload,
): string[] {
  const errors: string[] = [];
  const n = data.steps.length;
  const ids = data.steps.map((s) => s.id);
  if (new Set(ids).size !== ids.length) {
    errors.push("Step ids must be unique");
  }

  if (!data.perspectiveAName?.trim() || !data.perspectiveBName?.trim()) {
    errors.push("perspectiveAName and perspectiveBName are required");
  } else if (
    data.perspectiveAName.trim().toLowerCase() === data.perspectiveBName.trim().toLowerCase()
  ) {
    errors.push("perspectiveAName and perspectiveBName must differ");
  }

  errors.push(
    ...permutationErrors(data.steps.map((s) => s.correctPosition), n, "correctPosition"),
  );
  errors.push(
    ...permutationErrors(data.steps.map((s) => s.correctPositionB), n, "correctPositionB"),
  );

  if (!data.criticalErrorsB || data.criticalErrorsB.length === 0) {
    errors.push("criticalErrorsB must have at least one entry");
  }

  const idSet = new Set(ids);
  for (const s of data.steps) {
    for (const dep of s.dependencies) {
      if (!idSet.has(dep)) {
        errors.push(`Step ${s.id} references unknown dependency ${dep}`);
      }
    }
  }
  if (hasDependencyCycle(data.steps)) {
    errors.push("Step dependencies must not contain a cycle");
  }

  return errors;
}

/** Triage semantics: at least one critical-severity step, a sane time limit, and a valid
 * correctPosition permutation (severity weighting is applied client-side at scoring time). */
export function validateSequentialTriageSemantics(
  data: SequentialTriageExercisePayload,
): string[] {
  const errors: string[] = [];
  const n = data.steps.length;

  if (!data.steps.some((s) => s.severity === "critical")) {
    errors.push('At least one step must have severity "critical"');
  }
  if (
    !Number.isInteger(data.timeLimitMinutes) ||
    data.timeLimitMinutes < 1 ||
    data.timeLimitMinutes > 180
  ) {
    errors.push("timeLimitMinutes must be an integer between 1 and 180");
  }

  errors.push(
    ...permutationErrors(data.steps.map((s) => s.correctPosition), n, "correctPosition"),
  );

  return errors;
}

export const GEOPOLITICS_SEQUENTIAL_RETRY_SUFFIX = `
IMPORTANT: Your previous geopolitics sequential JSON failed validation. Fix ALL issues:
- perspectiveAName and perspectiveBName are required and must name different actors
- every step needs both correctPosition (Actor A) and correctPositionB (Actor B); each must be a permutation of 0..N-1 for the N steps (no gaps or duplicates)
- criticalErrors covers Actor A's ordering mistakes; criticalErrorsB (at least 1 entry) covers Actor B's ordering mistakes - keep the two lists distinct
- dependencies must reference only existing step ids and must not form a cycle
Return ONLY corrected valid JSON with the same shape as before.`;

export const SEQUENTIAL_TRIAGE_RETRY_SUFFIX = `
IMPORTANT: Your previous crisis-triage sequential JSON failed validation. Fix ALL issues:
- variantKind must be exactly "triage"
- timeLimitMinutes must be an integer between 1 and 180, proportional to the number of steps
- at least one step must have severity "critical" (mix of critical/major/minor across the steps)
- correctPosition values must form a permutation of 0..N-1 for the N steps (no gaps or duplicates)
- do not reveal severity levels or the time limit's rationale inside scenario or step text
Return ONLY corrected valid JSON with the same shape as before.`;
