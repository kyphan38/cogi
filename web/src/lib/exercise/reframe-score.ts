import type { ReframeAnswer, ReframeRewrite, ReframeTag, ReframeThought } from "@/lib/ai/validators/reframe";
import type { ResultRating } from "@/lib/exercise/levels";

/** How one thought was handled, scored in code (PLAN-psychology.md P1). */
export interface ReframeThoughtOutcome {
  id: string;
  /** The planned trap, or "realistic". */
  trap: ReframeAnswer;
  userAnswer: ReframeAnswer | null;
  /** A distorted thought the user marked with any trap. */
  found: boolean;
  /** Found, and the trap is the planned one or one also accepted. */
  tagMatched: boolean;
  /** A realistic thought the user marked as a trap. */
  trapped: boolean;
}

export interface ReframeResult {
  thoughts: ReframeThoughtOutcome[];
  found: number;
  /** Distorted thoughts in the exercise. */
  total: number;
  tagsMatched: number;
  trapsHit: number;
  /** Realistic thoughts in the exercise. */
  realisticTotal: number;
  /** Guided: the balanced rewrite was picked. Null when the user wrote their own. */
  rewriteCorrect: boolean | null;
}

export function scoreReframe(input: {
  thoughts: ReframeThought[];
  answers: Partial<Record<string, ReframeAnswer>>;
  rewrite: ReframeRewrite;
  /** Guided: the option index picked; undefined when the level asks to write. */
  rewriteChoice?: number | null;
  rewriteWritten: boolean;
}): ReframeResult {
  const thoughts = input.thoughts.map((t): ReframeThoughtOutcome => {
    const userAnswer = input.answers[t.id] ?? null;
    const markedTrap = userAnswer != null && userAnswer !== "realistic";
    const distorted = t.trap !== "realistic";
    const found = distorted && markedTrap;
    return {
      id: t.id,
      trap: t.trap,
      userAnswer,
      found,
      tagMatched: found && (userAnswer === t.trap || t.alsoAccepted.includes(userAnswer as ReframeTag)),
      trapped: !distorted && markedTrap,
    };
  });
  const distorted = thoughts.filter((t) => t.trap !== "realistic");
  return {
    thoughts,
    found: distorted.filter((t) => t.found).length,
    total: distorted.length,
    tagsMatched: distorted.filter((t) => t.tagMatched).length,
    trapsHit: thoughts.filter((t) => t.trapped).length,
    realisticTotal: thoughts.length - distorted.length,
    rewriteCorrect: input.rewriteWritten ? null : input.rewriteChoice === input.rewrite.answerIndex,
  };
}

/**
 * Rate one finished exercise for level suggestions, like Analytical: good when 75%+
 * of the traps are found with at most 1 realistic thought marked; poor when 25% or
 * fewer are found. Unlike Analytical, marking 2+ realistic thoughts is also poor:
 * seeing traps in fair thoughts is the habit this exercise trains away.
 */
export function rateReframe(r: ReframeResult): ResultRating {
  if (r.trapsHit >= 2) return "poor";
  if (r.total === 0) return r.trapsHit === 0 ? "good" : "ok";
  const share = r.found / r.total;
  if (share >= 0.75 && r.trapsHit <= 1) return "good";
  if (share <= 0.25) return "poor";
  return "ok";
}

/**
 * Coaching refs: `thought_<id>` for every thought (there are only 4-6), required when
 * it was not handled fully right; `rewrite` is always required.
 */
export function reframeCoachingRefs(r: ReframeResult): { required: string[]; allowed: string[] } {
  const ok = (t: ReframeThoughtOutcome) => (t.trap === "realistic" ? !t.trapped && t.userAnswer != null : t.tagMatched);
  return {
    required: [...r.thoughts.filter((t) => !ok(t)).map((t) => `thought_${t.id}`), "rewrite"],
    allowed: [...r.thoughts.map((t) => `thought_${t.id}`), "rewrite"],
  };
}
