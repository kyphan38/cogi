import { analyticalResultOf } from "@/lib/exercise/analytical-score";
import { rateAnalytical } from "@/lib/exercise/analytical-levels";
import { rateSystems, systemsResultOf } from "@/lib/exercise/systems-score";
import { evaluativeResultOf, rateEvaluative } from "@/lib/exercise/evaluative-score";
import { rateJudgment } from "@/lib/exercise/judgment-score";
import { rateTricky } from "@/lib/exercise/tricky-score";
import { rateHumor } from "@/lib/exercise/humor-score";
import { rateStrategy } from "@/lib/exercise/strategy-score";
import { rateReframe } from "@/lib/exercise/reframe-score";
import type { ResultRating } from "@/lib/exercise/levels";
import type { Exercise } from "@/lib/types/exercise";

/**
 * How one finished exercise went (good / ok / poor), as its own type rates it. Null
 * when the type has no rating (Calibration, Geo Lab, 5-minute) or there is no result.
 */
export function rateExercise(row: Exercise): ResultRating | null {
  switch (row.type) {
    // Geopolitics rows count too: they have levels since PLAN-geopolitics.md G1.
    case "analytical":
      return rateAnalytical(analyticalResultOf(row));
    case "systems":
      return rateSystems(systemsResultOf(row));
    case "evaluative":
      return rateEvaluative(evaluativeResultOf(row));
    case "strategy":
      return row.result ? rateStrategy(row.result) : null;
    case "reframe":
      return row.result ? rateReframe(row.result) : null;
    case "judgment":
      return row.result ? rateJudgment(row.result) : null;
    case "tricky":
      return row.result ? rateTricky(row.result) : null;
    case "humor":
      return row.result ? rateHumor(row.result) : null;
    default:
      return null;
  }
}
