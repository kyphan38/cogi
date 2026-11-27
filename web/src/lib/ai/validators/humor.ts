import { z } from "zod";
import { choiceErrors, choiceQuestionSchema, conceptSchema, stripJsonFences, isSafetyConcern } from "@/lib/ai/validators/judgment";
import { HUMOR_STEPS } from "@/lib/exercise/humor-levels";

export const HUMOR_QUALITIES = ["best", "ok", "poor"] as const;
export type HumorQuality = (typeof HUMOR_QUALITIES)[number];

const optionSchema = z.object({
  text: z.string().min(1),
  quality: z.enum(HUMOR_QUALITIES),
  why: z.string().min(1),
});

const roundSchema = z.object({
  /** What happens or what someone says, 1-2 sentences. */
  moment: z.string().min(1),
  /** True when the moment is serious and the best reply has no joke. */
  serious: z.boolean(),
  /** Short name of the common mistake here, e.g. "Hitting back". */
  trap: z.string().min(1),
  /** Why people fall into it, one sentence. */
  trapWhy: z.string().min(1),
  /** Three replies: one best, one ok, one poor. The best one is also the model reply. */
  options: z.array(optionSchema),
});

/**
 * A generated light-replies exercise. Title and setting may be empty only when
 * `safety` is "concern" (the user's own situation needs real support).
 */
export const humorExerciseSchema = z.object({
  safety: z.enum(["ok", "concern"]),
  title: z.string(),
  /** Where you are and who is there, in the second person. */
  setting: z.string(),
  concepts: z.array(conceptSchema),
  conceptChecks: z.array(choiceQuestionSchema),
  rounds: z.array(roundSchema),
});

export type HumorExercisePayload = z.infer<typeof humorExerciseSchema>;
export type HumorRound = z.infer<typeof roundSchema>;
export type HumorOption = z.infer<typeof optionSchema>;

export function parseHumorExerciseJson(
  text: string,
): { success: true; data: HumorExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  if (isSafetyConcern(parsed)) {
    const data: HumorExercisePayload = { safety: "concern", title: "", setting: "", concepts: [], conceptChecks: [], rounds: [] };
    return { success: true, data };
  }
  const result = humorExerciseSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Counts the flow relies on. "concern" is only allowed for the user's own situation. */
export function validateHumorSemantics(
  data: HumorExercisePayload,
  opts: { rounds: number; ownSituation?: boolean; seriousRound?: boolean },
): string[] {
  if (data.safety === "concern") {
    return opts.ownSituation ? [] : ['safety must be "ok" for a made-up situation'];
  }
  const errors: string[] = [];
  if (!data.title.trim()) errors.push("title must not be empty");
  if (!data.setting.trim()) errors.push("setting must not be empty");
  if (data.concepts.length < 2 || data.concepts.length > 4) errors.push("concepts must have 2-4 items");
  if (data.conceptChecks.length < 1 || data.conceptChecks.length > 2) errors.push("conceptChecks must have 1-2 items");
  data.conceptChecks.forEach((q, i) => errors.push(...choiceErrors(q, `conceptChecks[${i}]`)));
  if (data.rounds.length !== opts.rounds) errors.push(`rounds must have exactly ${opts.rounds} items`);
  const serious = data.rounds.filter((r) => r.serious).length;
  if (opts.seriousRound && serious !== 1) errors.push("exactly one round must be serious");
  if (!opts.seriousRound && serious > 0) errors.push("no round may be serious at this level");
  data.rounds.forEach((r, i) => {
    if (r.options.length !== 3) {
      errors.push(`rounds[${i}].options must have exactly 3 items`);
      return;
    }
    const qualities = r.options.map((o) => o.quality).sort();
    if (qualities.join() !== [...HUMOR_QUALITIES].sort().join()) {
      errors.push(`rounds[${i}].options must have one "best", one "ok" and one "poor"`);
    }
    const texts = r.options.map((o) => o.text.trim().toLowerCase());
    if (new Set(texts).size !== 3) errors.push(`rounds[${i}].options must be different from each other`);
  });
  return errors;
}

export const HUMOR_RETRY_SUFFIX =
  "Your previous JSON failed validation. Fix ALL issues and return ONLY the corrected JSON object.";

/** The AI's grade of written answers, one item per round. */
export const humorGradeSchema = z.object({
  rounds: z.array(
    z.object({
      steps: z.object(Object.fromEntries(HUMOR_STEPS.map((s) => [s, z.boolean()])) as Record<
        (typeof HUMOR_STEPS)[number],
        z.ZodBoolean
      >),
      strong: z.string(),
      missing: z.string(),
      better: z.string().min(1),
    }),
  ),
  overall: z.string().min(1),
});

export type HumorGrade = z.infer<typeof humorGradeSchema>;

export function parseHumorGradeJson(
  text: string,
): { success: true; data: HumorGrade } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = humorGradeSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

export function validateHumorGrade(data: HumorGrade, rounds: number): string[] {
  return data.rounds.length === rounds ? [] : [`rounds must have exactly ${rounds} items, one per moment`];
}
