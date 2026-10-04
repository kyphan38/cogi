import { z } from "zod";

/** The three lenses a life situation is read through (PLAN-learning.md L1). */
export const JUDGMENT_LENSES = ["think", "people", "steady"] as const;
export type JudgmentLens = (typeof JUDGMENT_LENSES)[number];

export const conceptSchema = z.object({
  term: z.string().min(1),
  plain: z.string().min(1),
  example: z.string().min(1),
});

export const choiceQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()),
  answerIndex: z.number().int(),
  explanation: z.string().min(1),
});

const lensQuestionSchema = choiceQuestionSchema.extend({
  lens: z.enum(JUDGMENT_LENSES),
});

const responseSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  /** Expert ranking, 1 = best. */
  expertRank: z.number().int(),
  why: z.string().min(1),
});

/** A generated life-situation exercise. */
export const judgmentExerciseSchema = z.object({
  title: z.string().min(1),
  scenario: z.string().min(1),
  concepts: z.array(conceptSchema),
  conceptChecks: z.array(choiceQuestionSchema),
  lensQuestions: z.array(lensQuestionSchema),
  responses: z.array(responseSchema),
});

export type JudgmentExercisePayload = z.infer<typeof judgmentExerciseSchema>;
export type JudgmentConcept = z.infer<typeof conceptSchema>;
export type JudgmentChoiceQuestion = z.infer<typeof choiceQuestionSchema>;
export type JudgmentLensQuestion = z.infer<typeof lensQuestionSchema>;
export type JudgmentResponse = z.infer<typeof responseSchema>;

export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m?.[1] ? m[1].trim() : trimmed;
}

export function parseJudgmentExerciseJson(
  text: string,
): { success: true; data: JudgmentExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = judgmentExerciseSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

export function choiceErrors(q: JudgmentChoiceQuestion, where: string): string[] {
  const errors: string[] = [];
  const options = q.options.map((o) => o.trim());
  if (options.length !== 3 || options.some((o) => !o)) {
    errors.push(`${where}: options must be exactly 3 non-empty strings`);
  } else if (new Set(options.map((o) => o.toLowerCase())).size !== 3) {
    errors.push(`${where}: options must be different from each other`);
  }
  if (q.answerIndex < 0 || q.answerIndex > 2) errors.push(`${where}: answerIndex must be 0, 1 or 2`);
  return errors;
}

/**
 * Counts and consistency the exercise relies on: concepts and checks for "Learn
 * first", one question per lens, and responses ranked 1..n with ids r1..rn.
 */
export function validateJudgmentSemantics(
  data: JudgmentExercisePayload,
  opts: { responseCount: number },
): string[] {
  const errors: string[] = [];
  if (data.concepts.length < 2 || data.concepts.length > 4) errors.push("concepts must have 2-4 items");
  if (data.conceptChecks.length < 1 || data.conceptChecks.length > 2) {
    errors.push("conceptChecks must have 1-2 items");
  }
  data.conceptChecks.forEach((q, i) => errors.push(...choiceErrors(q, `conceptChecks[${i}]`)));

  const lenses = data.lensQuestions.map((q) => q.lens);
  if (lenses.length !== 3 || new Set(lenses).size !== 3) {
    errors.push(`lensQuestions must have exactly one question for each lens: ${JUDGMENT_LENSES.join(", ")}`);
  }
  data.lensQuestions.forEach((q) => errors.push(...choiceErrors(q, `lensQuestions[${q.lens}]`)));

  const n = opts.responseCount;
  if (data.responses.length !== n) errors.push(`responses must have exactly ${n} items`);
  const ids = data.responses.map((r) => r.id);
  const expectedIds = Array.from({ length: n }, (_, i) => `r${i + 1}`);
  if ([...ids].sort().join() !== expectedIds.join()) errors.push(`response ids must be ${expectedIds.join(", ")}`);
  const ranks = data.responses.map((r) => r.expertRank).sort((a, b) => a - b);
  if (ranks.join() !== expectedIds.map((_, i) => i + 1).join()) {
    errors.push(`expertRank values must be 1..${n}, each used once`);
  }
  return errors;
}

export const JUDGMENT_RETRY_SUFFIX =
  "Your previous JSON failed validation. Fix ALL issues and return ONLY the corrected JSON object.";
