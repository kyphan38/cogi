import { analyticalResultOf } from "@/lib/exercise/analytical-score";
import { evaluativeResultOf } from "@/lib/exercise/evaluative-score";
import { systemsResultOf } from "@/lib/exercise/systems-score";
import type { Exercise } from "@/lib/types/exercise";

/** One finished exercise in a line, plus a 0..1 score for comparing two tries or two months. */
export interface ScoreSummary {
  line: string;
  /** Null when the exercise has nothing to count. */
  ratio: number | null;
}

const share = (n: number, total: number): number | null => (total > 0 ? n / total : null);

function mean(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
}

/** The stored result of a finished exercise, in words. Null: no result to read (Geo Lab, very old rows). */
export function scoreSummary(ex: Exercise): ScoreSummary | null {
  switch (ex.type) {
    case "analytical": {
      const r = analyticalResultOf(ex);
      const traps = r.trapsHit > 0 ? `, ${r.trapsHit} sound ${r.trapsHit === 1 ? "point" : "points"} flagged` : "";
      if (r.total === 0) {
        return { line: `No issues to find${traps}`, ratio: r.decoyTotal > 0 ? 1 - r.trapsHit / r.decoyTotal : null };
      }
      return { line: `Found ${r.found} of ${r.total} issues${traps}`, ratio: r.found / r.total };
    }
    case "systems": {
      const r = systemsResultOf(ex);
      return {
        line: `${r.connectionsFound} of ${r.connectionsTotal} links, ${r.impactsCorrect} of ${r.impactsTotal} impacts`,
        ratio: mean([share(r.connectionsFound, r.connectionsTotal), share(r.impactsCorrect, r.impactsTotal)]),
      };
    }
    case "evaluative": {
      const r = evaluativeResultOf(ex);
      if (r.variant === "matrix") return { line: `${r.correct} of ${r.total} options placed right`, ratio: share(r.correct, r.total) };
      return { line: r.topMatch ? "Best option: same as the model" : "Best option: different from the model", ratio: r.topMatch ? 1 : 0 };
    }
    case "judgment": {
      const r = ex.result;
      if (!r) return null;
      return {
        line: `Order ${Math.round(r.closeness * 100)}% like the expert, best response ${r.topMatch ? "matched" : "not matched"}`,
        ratio: r.closeness,
      };
    }
    case "tricky": {
      const r = ex.result;
      if (!r) return null;
      return {
        line:
          r.mode === "choose"
            ? `${r.rounds.filter((x) => x.quality === "best").length} of ${r.rounds.length} best answers picked`
            : `${Math.round(r.score * 100)}% of the four steps used`,
        ratio: r.score,
      };
    }
    case "humor": {
      const r = ex.result;
      if (!r) return null;
      return {
        line:
          r.mode === "choose"
            ? `${r.rounds.filter((x) => x.quality === "best").length} of ${r.rounds.length} best replies picked`
            : `${Math.round(r.score * 100)}% of the four checks passed`,
        ratio: r.score,
      };
    }
    case "strategy": {
      const r = ex.result;
      if (!r) return null;
      if (r.predictionCorrect) return { line: "Prediction right", ratio: 1 };
      return r.predictionPartial ? { line: "Prediction partly right", ratio: 0.5 } : { line: "Prediction not right", ratio: 0 };
    }
    case "reframe": {
      const r = ex.result;
      if (!r) return null;
      const traps = r.trapsHit > 0 ? `, ${r.trapsHit} fair ${r.trapsHit === 1 ? "thought" : "thoughts"} flagged` : "";
      return { line: `Found ${r.found} of ${r.total} traps${traps}`, ratio: share(r.found, r.total) };
    }
    case "calibration": {
      const r = ex.result;
      if (!r) return null;
      const answered = r.items.filter((i) => i.answered);
      const right = answered.filter((i) => i.correct).length;
      return { line: `${right} of ${answered.length} right`, ratio: share(right, answered.length) };
    }
    default:
      return null;
  }
}

/** How a redo compares with the first try: "better", "same" or "lower", or null when either has no score. */
export function compareTries(first: Exercise, redo: Exercise): "better" | "same" | "lower" | null {
  const a = scoreSummary(first)?.ratio;
  const b = scoreSummary(redo)?.ratio;
  if (a == null || b == null) return null;
  return Math.abs(a - b) < 0.005 ? "same" : b > a ? "better" : "lower";
}
