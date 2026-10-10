import type {
  EvaluativeExerciseRow,
  EvaluativeMatrixRow,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
} from "@/lib/types/exercise";
import type { EvaluativeQuadrant } from "@/lib/ai/validators/evaluative";
import { computeOptionEv } from "@/lib/analytics/calibration-evaluative";
import { DEALBREAKER_PASS_THRESHOLD } from "@/lib/analytics/evaluative-dealbreaker";
import type { ResultRating } from "@/lib/exercise/levels";

/** "top-right" -> "top-right (Cost: high, Value: high)", using the exercise's axis words. */
export function quadrantName(
  q: EvaluativeQuadrant,
  axisX: EvaluativeMatrixRow["axisX"],
  axisY: EvaluativeMatrixRow["axisY"],
): string {
  const x = q.endsWith("right") ? axisX.highLabel : axisX.lowLabel;
  const y = q.startsWith("top") ? axisY.highLabel : axisY.lowLabel;
  return `${q} (${axisX.label}: ${x}, ${axisY.label}: ${y})`;
}

/** A gap this big (on the 1-5 scales) is worth a comment. */
export const BIG_GAP = 2;

export interface MatrixResult {
  variant: "matrix";
  placements: {
    optionId: string;
    intended: EvaluativeQuadrant;
    user: EvaluativeQuadrant | null;
    correct: boolean;
    /** Placed on the right side of exactly one axis. Absent on older results. */
    oneAxis?: boolean;
  }[];
  correct: number;
  total: number;
  /** Options with exactly one axis right. Absent on older results. */
  oneAxis?: number;
}

/** Which axes a placement gets right: [across, up]. */
export function axesRight(user: EvaluativeQuadrant, intended: EvaluativeQuadrant): [boolean, boolean] {
  return [user.endsWith("right") === intended.endsWith("right"), user.startsWith("top") === intended.startsWith("top")];
}

export interface ScoringResult {
  variant: "scoring";
  criteria: { criterionId: string; userWeight: number; modelWeight: number; gap: number }[];
  /** Score cells where the user and the model differ by `BIG_GAP` or more. */
  bigCells: { optionId: string; criterionId: string; user: number; model: number }[];
  /** Option ids, best first; options failing a dealbreaker are left out. */
  userOrder: string[];
  modelOrder: string[];
  topMatch: boolean;
}

export interface UncertaintyResult {
  variant: "uncertainty";
  /** Expected values; null when the user's probabilities do not add up to 1. */
  options: { optionId: string; userEv: number | null; modelEv: number | null }[];
  userOrder: string[];
  modelOrder: string[];
  topMatch: boolean;
}

/** Evaluative work compared with the model, in code (plan phase 6a). */
export type EvaluativeResult = MatrixResult | ScoringResult | UncertaintyResult;

function order(entries: { id: string; value: number | null }[]): string[] {
  return entries
    .filter((e): e is { id: string; value: number } => e.value != null)
    .sort((a, b) => b.value - a.value)
    .map((e) => e.id);
}

function scoreMatrix(ex: EvaluativeMatrixRow, placements: EvaluativeMatrixRow["placements"]): MatrixResult {
  const rows = ex.options.map((o) => {
    const user = placements[o.id] ?? null;
    const [x, y] = user ? axesRight(user, o.intendedQuadrant) : [false, false];
    return { optionId: o.id, intended: o.intendedQuadrant, user, correct: x && y, oneAxis: x !== y };
  });
  return {
    variant: "matrix",
    placements: rows,
    correct: rows.filter((r) => r.correct).length,
    total: rows.length,
    oneAxis: rows.filter((r) => r.oneAxis).length,
  };
}

function weightedTotal(
  ex: EvaluativeScoringRow,
  weightOf: (criterionId: string) => number,
  scoreOf: (criterionId: string) => number,
): number | null {
  // A dealbreaker scored below the pass mark rules the option out.
  if (ex.criteria.some((c) => c.isDealbreaker && scoreOf(c.id) < DEALBREAKER_PASS_THRESHOLD)) return null;
  let num = 0;
  let den = 0;
  for (const c of ex.criteria) {
    num += weightOf(c.id) * scoreOf(c.id);
    den += weightOf(c.id);
  }
  return den === 0 ? 0 : num / den;
}

function scoreScoring(
  ex: EvaluativeScoringRow,
  weights: Record<string, number>,
  scores: Record<string, Record<string, number>>,
): ScoringResult {
  const userWeight = (id: string) => weights[id] ?? 1;
  const modelWeight = (id: string) => ex.criteria.find((c) => c.id === id)?.suggestedWeight ?? 1;
  const criteria = ex.criteria.map((c) => ({
    criterionId: c.id,
    userWeight: userWeight(c.id),
    modelWeight: c.suggestedWeight,
    gap: userWeight(c.id) - c.suggestedWeight,
  }));
  const bigCells = ex.options.flatMap((o) =>
    ex.criteria
      .map((c) => ({
        optionId: o.id,
        criterionId: c.id,
        user: scores[o.id]?.[c.id] ?? 3,
        model: o.suggestedScores[c.id] ?? 3,
      }))
      .filter((cell) => Math.abs(cell.user - cell.model) >= BIG_GAP),
  );
  const userOrder = order(
    ex.options.map((o) => ({ id: o.id, value: weightedTotal(ex, userWeight, (c) => scores[o.id]?.[c] ?? 3) })),
  );
  const modelOrder = order(
    ex.options.map((o) => ({ id: o.id, value: weightedTotal(ex, modelWeight, (c) => o.suggestedScores[c] ?? 3) })),
  );
  return {
    variant: "scoring",
    criteria,
    bigCells,
    userOrder,
    modelOrder,
    topMatch: userOrder[0] != null && userOrder[0] === modelOrder[0],
  };
}

function scoreUncertainty(
  ex: EvaluativeUncertaintyRow,
  probabilities: EvaluativeUncertaintyRow["userProbabilities"],
  payoffs: EvaluativeUncertaintyRow["userPayoffs"],
): UncertaintyResult {
  const options = ex.options.map((o) => ({
    optionId: o.id,
    userEv: computeOptionEv(
      o.outcomes.map((out) => ({
        probability: probabilities[o.id]?.[out.id] ?? 0,
        payoff: payoffs[o.id]?.[out.id] ?? 0,
      })),
    ),
    modelEv: computeOptionEv(o.outcomes.map((out) => ({ probability: out.probability, payoff: out.payoff }))),
  }));
  const userOrder = order(options.map((o) => ({ id: o.optionId, value: o.userEv })));
  const modelOrder = order(options.map((o) => ({ id: o.optionId, value: o.modelEv })));
  return {
    variant: "uncertainty",
    options,
    userOrder,
    modelOrder,
    topMatch: userOrder[0] != null && userOrder[0] === modelOrder[0],
  };
}

/** Score the row as saved (its placements, weights, scores or estimates). */
export function scoreEvaluative(ex: EvaluativeExerciseRow): EvaluativeResult {
  if (ex.variant === "matrix") return scoreMatrix(ex, ex.placements);
  if (ex.variant === "uncertainty") return scoreUncertainty(ex, ex.userProbabilities, ex.userPayoffs);
  return scoreScoring(ex, ex.criterionWeights, ex.scores);
}

/** The stored result, or a fresh score for rows saved before results were stored. */
export function evaluativeResultOf(ex: EvaluativeExerciseRow & { result?: EvaluativeResult | null }): EvaluativeResult {
  return ex.result ?? scoreEvaluative(ex);
}

/**
 * Matrix has a model answer: one axis right counts half. Good from 75%, poor at 25% or less.
 * Scoring and uncertainty are judgment calls: good when the best option matches the
 * model's, otherwise ok - never poor, so they never suggest a lower level.
 */
export function rateEvaluative(r: EvaluativeResult): ResultRating {
  if (r.variant === "matrix") {
    const share = r.total > 0 ? (r.correct + 0.5 * (r.oneAxis ?? 0)) / r.total : 0;
    if (share >= 0.75) return "good";
    return share <= 0.25 ? "poor" : "ok";
  }
  return r.topMatch ? "good" : "ok";
}

/** Most criteria rows to require a comment on. */
const MAX_REQUIRED_CRITERIA = 4;

/**
 * Coaching refs: `option_<id>` (matrix, uncertainty) or `criterion_<id>` (scoring).
 * Required: misplaced options; criteria with a big weight or score gap (up to 4);
 * every uncertainty option.
 */
export function evaluativeCoachingRefs(r: EvaluativeResult): { required: string[]; allowed: string[] } {
  if (r.variant === "matrix") {
    return {
      required: r.placements.filter((p) => !p.correct).map((p) => `option_${p.optionId}`),
      allowed: r.placements.map((p) => `option_${p.optionId}`),
    };
  }
  if (r.variant === "uncertainty") {
    const refs = r.options.map((o) => `option_${o.optionId}`);
    return { required: refs, allowed: refs };
  }
  const bigCriteria = new Set(r.bigCells.map((c) => c.criterionId));
  return {
    required: r.criteria
      .filter((c) => Math.abs(c.gap) >= BIG_GAP || bigCriteria.has(c.criterionId))
      .slice(0, MAX_REQUIRED_CRITERIA)
      .map((c) => `criterion_${c.criterionId}`),
    allowed: r.criteria.map((c) => `criterion_${c.criterionId}`),
  };
}
