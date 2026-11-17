import { z } from "zod";
import { choiceErrors, choiceQuestionSchema, conceptSchema, stripJsonFences } from "@/lib/ai/validators/judgment";
import { TRICKY_STEPS } from "@/lib/exercise/tricky-levels";

export const TRICKY_QUALITIES = ["best", "ok", "poor"] as const;
export type TrickyQuality = (typeof TRICKY_QUALITIES)[number];

const optionSchema = z.object({
  text: z.string().min(1),
  quality: z.enum(TRICKY_QUALITIES),
  why: z.string().min(1),
});

const roundSchema = z.object({
  /** What the person asks, in their own words. */
  question: z.string().min(1),
  /** Short name of the trap, e.g. "False choice". */
  trap: z.string().min(1),
  /** Why it is a trap, one sentence. */
  trapWhy: z.string().min(1),
  /** Three answers: one best, one ok, one poor. The best one is also the model answer. */
  options: z.array(optionSchema),
});

/**
 * A generated tricky-question exercise. Title and setting may be empty only when
 * `safety` is "concern" (the user's own situation needs real support).
 */
export const trickyExerciseSchema = z.object({
  safety: z.enum(["ok", "concern"]),
  title: z.string(),
  /** Who asks, where, and who is listening, in the second person. */
  setting: z.string(),
  /** Who asks, short, e.g. "Your manager". */
  asker: z.string(),
  concepts: z.array(conceptSchema),
  conceptChecks: z.array(choiceQuestionSchema),
  rounds: z.array(roundSchema),
});

export type TrickyExercisePayload = z.infer<typeof trickyExerciseSchema>;
export type TrickyRound = z.infer<typeof roundSchema>;
export type TrickyOption = z.infer<typeof optionSchema>;

export function parseTrickyExerciseJson(
  text: string,
): { success: true; data: TrickyExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = trickyExerciseSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/** Counts the flow relies on. "concern" is only allowed for the user's own situation. */
export function validateTrickySemantics(
  data: TrickyExercisePayload,
  opts: { rounds: number; ownSituation?: boolean },
): string[] {
  if (data.safety === "concern") {
    return opts.ownSituation ? [] : ['safety must be "ok" for a made-up situation'];
  }
  const errors: string[] = [];
  if (!data.title.trim()) errors.push("title must not be empty");
  if (!data.setting.trim()) errors.push("setting must not be empty");
  if (!data.asker.trim()) errors.push("asker must not be empty");
  if (data.concepts.length < 2 || data.concepts.length > 4) errors.push("concepts must have 2-4 items");
  if (data.conceptChecks.length < 1 || data.conceptChecks.length > 2) errors.push("conceptChecks must have 1-2 items");
  data.conceptChecks.forEach((q, i) => errors.push(...choiceErrors(q, `conceptChecks[${i}]`)));
  if (data.rounds.length !== opts.rounds) errors.push(`rounds must have exactly ${opts.rounds} items`);
  data.rounds.forEach((r, i) => {
    if (r.options.length !== 3) {
      errors.push(`rounds[${i}].options must have exactly 3 items`);
      return;
    }
    const qualities = r.options.map((o) => o.quality).sort();
    if (qualities.join() !== [...TRICKY_QUALITIES].sort().join()) {
      errors.push(`rounds[${i}].options must have one "best", one "ok" and one "poor"`);
    }
    const texts = r.options.map((o) => o.text.trim().toLowerCase());
    if (new Set(texts).size !== 3) errors.push(`rounds[${i}].options must be different from each other`);
  });
  return errors;
}

export const TRICKY_RETRY_SUFFIX =
  "Your previous JSON failed validation. Fix ALL issues and return ONLY the corrected JSON object.";

/** The AI's grade of written answers, one item per round. */
export const trickyGradeSchema = z.object({
  rounds: z.array(
    z.object({
      steps: z.object(Object.fromEntries(TRICKY_STEPS.map((s) => [s, z.boolean()])) as Record<
        (typeof TRICKY_STEPS)[number],
        z.ZodBoolean
      >),
      strong: z.string(),
      missing: z.string(),
      better: z.string().min(1),
    }),
  ),
  overall: z.string().min(1),
});

export type TrickyGrade = z.infer<typeof trickyGradeSchema>;

export function parseTrickyGradeJson(
  text: string,
): { success: true; data: TrickyGrade } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = trickyGradeSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

export function validateTrickyGrade(data: TrickyGrade, rounds: number): string[] {
  return data.rounds.length === rounds ? [] : [`rounds must have exactly ${rounds} items, one per question`];
}
