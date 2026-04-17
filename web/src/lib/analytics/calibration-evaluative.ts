/**
 * Evaluative calibration per ai_plan.txt §1.3b (~309):
 * - Matrix: binary match per option vs intendedQuadrant; accuracy = mean * 100.
 * - Scoring: mean absolute error vs AI suggestedScores per (option × criterion) cell;
 *   map to 0–100 via MAE on 0–4 scale: accuracy = round(clamp(0, 100, 100 * (1 - meanAbsError / 4))).
 */

import type {
  EvaluativeExerciseRow,
  EvaluativeMatrixRow,
  EvaluativeQuadrant,
  EvaluativeScoringRow,
} from "@/lib/types/exercise";

const MAX_SCORE_DELTA = 4;

export function computeEvaluativeMatrixAccuracy(ex: EvaluativeMatrixRow): number {
  if (ex.options.length === 0) return 0;
  let hits = 0;
  for (const o of ex.options) {
    const p = ex.placements[o.id];
    if (p === o.intendedQuadrant) hits += 1;
  }
  return Math.round((100 * hits) / ex.options.length);
}

export function computeEvaluativeScoringAccuracy(ex: EvaluativeScoringRow): number {
  const cells: number[] = [];
  for (const opt of ex.options) {
    for (const c of ex.criteria) {
      const suggested = opt.suggestedScores[c.id];
      const user = ex.scores[opt.id]?.[c.id];
      if (
        typeof suggested !== "number" ||
        typeof user !== "number" ||
        !Number.isFinite(suggested) ||
        !Number.isFinite(user)
      ) {
        continue;
      }
      cells.push(Math.abs(user - suggested));
    }
  }
  if (cells.length === 0) return 0;
  const meanAbs = cells.reduce((a, b) => a + b, 0) / cells.length;
  const raw = 100 * (1 - meanAbs / MAX_SCORE_DELTA);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function computeEvaluativeAccuracy(ex: EvaluativeExerciseRow): number {
  if (ex.variant === "matrix") return computeEvaluativeMatrixAccuracy(ex);
  return computeEvaluativeScoringAccuracy(ex);
}

export function isQuadrant(v: string | undefined): v is EvaluativeQuadrant {
  return (
    v === "top-left" ||
    v === "top-right" ||
    v === "bottom-left" ||
    v === "bottom-right"
  );
}
