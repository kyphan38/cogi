import type { JudgmentLens, JudgmentLensQuestion, JudgmentResponse } from "@/lib/ai/validators/judgment";
import type { ResultRating } from "@/lib/exercise/levels";

/** A life-situation answer compared with the expert, in code (PLAN-learning.md L1). */
export interface JudgmentResult {
  /** Per response: where the user and the expert put it (1 = best). */
  responses: { id: string; userRank: number; expertRank: number }[];
  /** 0..1: the share of pairs the user put in the expert's order (1 = same order, 0 = reversed). */
  closeness: number;
  /** The user's first choice is the expert's best response. */
  topMatch: boolean;
  /** Per lens: the right reading picked, or null when answered in free text. */
  lenses: { lens: JudgmentLens; correct: boolean | null }[];
}

/**
 * How many pairs of responses the user put in the same order as the expert. Pairs, not
 * rank distance: with 3 responses a distance score only gives 100%, 50% or 0%, and
 * putting the best one second could score 0%.
 */
export function pairsLikeExpert(rows: { userRank: number; expertRank: number }[]): { agree: number; total: number } {
  let agree = 0;
  let total = 0;
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      total += 1;
      const a = rows[i]!;
      const b = rows[j]!;
      if (Math.sign(a.userRank - b.userRank) === Math.sign(a.expertRank - b.expertRank)) agree += 1;
    }
  }
  return { agree, total };
}

/** `userOrder` is the response ids, best first. */
export function scoreJudgment(input: {
  responses: JudgmentResponse[];
  userOrder: string[];
  lensQuestions: JudgmentLensQuestion[];
  lensAnswers: Partial<Record<JudgmentLens, number>>;
  lensFreeText: boolean;
}): JudgmentResult {
  const n = input.responses.length;
  const rows = input.responses.map((r) => {
    const at = input.userOrder.indexOf(r.id);
    return { id: r.id, userRank: at >= 0 ? at + 1 : n, expertRank: r.expertRank };
  });
  const pairs = pairsLikeExpert(rows);
  const best = input.responses.find((r) => r.expertRank === 1)?.id;
  return {
    responses: rows,
    closeness: pairs.total > 0 ? Math.round((pairs.agree / pairs.total) * 100) / 100 : 1,
    topMatch: best != null && input.userOrder[0] === best,
    lenses: input.lensQuestions.map((q) => ({
      lens: q.lens,
      correct: input.lensFreeText ? null : input.lensAnswers[q.lens] === q.answerIndex,
    })),
  };
}

/**
 * Social situations have no single right answer, so this never rates "poor": good when
 * the first choice matches the expert and the order is close (75%+), otherwise ok.
 */
export function rateJudgment(r: JudgmentResult): ResultRating {
  return r.topMatch && r.closeness >= 0.75 ? "good" : "ok";
}

/**
 * Coaching refs: `response_<id>` for every response (there are only 3-4), `lens_<lens>`
 * for readings that differ or were written freely, `own` for the user's own response.
 */
export function judgmentCoachingRefs(
  r: JudgmentResult,
  opts: { hasOwnResponse: boolean },
): { required: string[]; allowed: string[] } {
  const responseRefs = r.responses.map((x) => `response_${x.id}`);
  const lensRefs = r.lenses.map((l) => `lens_${l.lens}`);
  return {
    required: [
      ...responseRefs,
      ...r.lenses.filter((l) => l.correct !== true).map((l) => `lens_${l.lens}`),
      ...(opts.hasOwnResponse ? ["own"] : []),
    ],
    allowed: [...responseRefs, ...lensRefs, ...(opts.hasOwnResponse ? ["own"] : [])],
  };
}
