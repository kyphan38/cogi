import { z } from "zod";
import {
  choiceErrors,
  choiceQuestionSchema,
  conceptSchema,
  stripJsonFences,
} from "@/lib/ai/validators/judgment";
import { mostlyRepeats } from "@/lib/exercise/reframe-trap-cards";

/** Thinking traps (CBT cognitive distortions) used in Reframe (PLAN-psychology.md P1). */
export const REFRAME_TAGS = [
  "all_or_nothing",
  "catastrophizing",
  "mind_reading",
  "should_statements",
  "overgeneralizing",
  "fortune_telling",
  "labeling",
  "personalizing",
  "emotional_reasoning",
  "discounting_positive",
] as const;
export type ReframeTag = (typeof REFRAME_TAGS)[number];

/** What a thought is (and what the user can mark it as): one of the traps, or realistic. */
export const REFRAME_ANSWERS = [...REFRAME_TAGS, "realistic"] as const;
export type ReframeAnswer = (typeof REFRAME_ANSWERS)[number];

const thoughtSchema = z.object({
  id: z.string(),
  text: z.string(),
  /** The main trap in this thought, or "realistic" for a fair thought (a decoy). */
  trap: z.enum(REFRAME_ANSWERS),
  /** Other traps that also fairly describe it (traps overlap). */
  alsoAccepted: z.array(z.enum(REFRAME_TAGS)),
  why: z.string(),
});

const rewriteSchema = choiceQuestionSchema.extend({
  /** The distorted thought to rewrite. */
  thoughtId: z.string(),
  /** A balanced version, shown as a reference after the user writes their own. */
  balancedExample: z.string(),
});

/**
 * A generated Reframe exercise. Strings may be empty only when `safety` is "concern"
 * (the user's own situation needs real support, not an exercise); the semantic
 * checks enforce the rest.
 */
export const reframeExerciseSchema = z.object({
  safety: z.enum(["ok", "concern"]),
  title: z.string(),
  scenario: z.string(),
  concepts: z.array(conceptSchema),
  conceptChecks: z.array(choiceQuestionSchema),
  thoughts: z.array(thoughtSchema),
  rewrite: rewriteSchema,
});

export type ReframeExercisePayload = z.infer<typeof reframeExerciseSchema>;
export type ReframeThought = z.infer<typeof thoughtSchema>;
export type ReframeRewrite = z.infer<typeof rewriteSchema>;

export function parseReframeExerciseJson(
  text: string,
): { success: true; data: ReframeExercisePayload } | { success: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(text));
  } catch {
    return { success: false, error: "Invalid JSON from model" };
  }
  const result = reframeExerciseSchema.safeParse(parsed);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  return { success: true, data: result.data };
}

/**
 * Counts and consistency the exercise relies on: thought ids t1..tn, traps only from
 * the level's list, the planned number of realistic thoughts, and a rewrite of a
 * distorted thought. "concern" is only allowed for the user's own situation.
 */
export function validateReframeSemantics(
  data: ReframeExercisePayload,
  opts: { thoughtCount: number; realistic: readonly [number, number]; tags: readonly ReframeTag[]; ownSituation: boolean },
): string[] {
  if (data.safety === "concern") {
    return opts.ownSituation ? [] : ['safety must be "ok" for a made-up situation'];
  }
  const errors: string[] = [];
  if (!data.title.trim()) errors.push("title must not be empty");
  if (!data.scenario.trim()) errors.push("scenario must not be empty");
  if (data.concepts.length < 2 || data.concepts.length > 4) errors.push("concepts must have 2-4 items");
  if (data.concepts.some((c) => !c.term.trim() || !c.plain.trim() || !c.example.trim())) {
    errors.push("every concept needs a term, plain and example");
  }
  if (data.conceptChecks.length < 1 || data.conceptChecks.length > 2) {
    errors.push("conceptChecks must have 1-2 items");
  }
  data.conceptChecks.forEach((q, i) => errors.push(...choiceErrors(q, `conceptChecks[${i}]`)));

  const n = opts.thoughtCount;
  if (data.thoughts.length !== n) errors.push(`thoughts must have exactly ${n} items`);
  const expectedIds = Array.from({ length: n }, (_, i) => `t${i + 1}`);
  if (data.thoughts.map((t) => t.id).sort().join() !== [...expectedIds].sort().join()) {
    errors.push(`thought ids must be ${expectedIds.join(", ")}`);
  }
  const allowed = new Set<string>(opts.tags);
  data.thoughts.forEach((t) => {
    if (!t.text.trim()) errors.push(`${t.id}: text must not be empty`);
    if (!t.why.trim()) errors.push(`${t.id}: why must not be empty`);
    if (t.trap !== "realistic" && !allowed.has(t.trap)) {
      errors.push(`${t.id}: trap must be one of ${opts.tags.join(", ")} or "realistic"`);
    }
    if (t.trap === "realistic" && t.alsoAccepted.length > 0) errors.push(`${t.id}: a realistic thought has no alsoAccepted`);
    if (t.trap !== "realistic" && t.alsoAccepted.includes(t.trap)) errors.push(`${t.id}: alsoAccepted must not repeat trap`);
    if (t.alsoAccepted.some((a) => !allowed.has(a))) errors.push(`${t.id}: alsoAccepted must use the same list of traps`);
  });
  const realistic = data.thoughts.filter((t) => t.trap === "realistic").length;
  const [minR, maxR] = opts.realistic;
  if (realistic < minR || realistic > maxR) {
    errors.push(
      minR === maxR
        ? `exactly ${minR} thought(s) must be realistic (trap: "realistic")`
        : `between ${minR} and ${maxR} thoughts must be realistic (trap: "realistic")`,
    );
  }

  const target = data.thoughts.find((t) => t.id === data.rewrite.thoughtId);
  if (!target || target.trap === "realistic") errors.push("rewrite.thoughtId must be a distorted thought");
  // A fair thought that already says the balanced rewrite gives the answer away.
  const balanced = data.rewrite.options[data.rewrite.answerIndex] ?? "";
  for (const t of data.thoughts) {
    if (t.trap === "realistic" && balanced && mostlyRepeats(balanced, t.text)) {
      errors.push(`${t.id}: this realistic thought repeats the balanced rewrite; make it about another part of the situation`);
    }
  }
  if (!data.rewrite.balancedExample.trim()) errors.push("rewrite.balancedExample must not be empty");
  errors.push(...choiceErrors(data.rewrite, "rewrite"));
  return errors;
}

export const REFRAME_RETRY_SUFFIX =
  "Your previous JSON failed validation. Fix ALL issues and return ONLY the corrected JSON object.";
