import { listCompletedExercises } from "@/lib/db/exercises";
import { getAppSettings } from "@/lib/db/settings";
import {
  isAnalyticalExercise,
  isEvaluativeExercise,
  isJudgmentExercise,
  isReframeExercise,
  isCalibrationExercise,
  isStrategyExercise,
  isSystemsExercise,
  type Exercise,
} from "@/lib/types/exercise";
import { analyticalResultOf } from "@/lib/exercise/analytical-score";
import { rateAnalytical } from "@/lib/exercise/analytical-levels";
import { rateSystems, systemsResultOf } from "@/lib/exercise/systems-score";
import { evaluativeResultOf, rateEvaluative } from "@/lib/exercise/evaluative-score";
import { rateJudgment } from "@/lib/exercise/judgment-score";
import { rateStrategy } from "@/lib/exercise/strategy-score";
import { rateReframe } from "@/lib/exercise/reframe-score";
import { rateCalibration } from "@/lib/exercise/calibration-score";
import {
  suggestLevelChange,
  type LevelledExerciseType,
  type LevelSuggestion,
  type PracticeLevel,
  type ResultRating,
} from "@/lib/exercise/levels";

/** How many recent finished exercises to look at; streaks need at most 3. */
const LOOKBACK = 30;

/**
 * Rate one finished row of `type`, or null when it is another type.
 */
function rateRow(type: LevelledExerciseType, row: Exercise): ResultRating | null {
  // Geopolitics rows count too: they have levels since PLAN-geopolitics.md G1.
  if (type === "analytical" && isAnalyticalExercise(row)) {
    return rateAnalytical(analyticalResultOf(row));
  }
  if (type === "systems" && isSystemsExercise(row)) {
    return rateSystems(systemsResultOf(row));
  }
  if (type === "evaluative" && isEvaluativeExercise(row)) {
    return rateEvaluative(evaluativeResultOf(row));
  }
  if (type === "strategy" && isStrategyExercise(row)) {
    return row.result ? rateStrategy(row.result) : null;
  }
  if (type === "calibration" && isCalibrationExercise(row)) {
    return row.result ? rateCalibration(row.result) : null;
  }
  if (type === "reframe" && isReframeExercise(row)) {
    return row.result ? rateReframe(row.result) : null;
  }
  if (type === "judgment" && isJudgmentExercise(row)) {
    return row.result ? rateJudgment(row.result) : null;
  }
  return null;
}

/**
 * Level suggestion after finishing an exercise: rates the exercises of `type` finished
 * at `level` since the last "Not now", newest first.
 */
export async function levelSuggestionFor(
  type: LevelledExerciseType,
  level: PracticeLevel,
): Promise<LevelSuggestion> {
  const [rows, settings] = await Promise.all([
    listCompletedExercises({ type }, LOOKBACK),
    getAppSettings(),
  ]);
  const dismissedAt = settings.levelSuggestionDismissedAt?.[type];
  const ratings = rows
    .filter((r) => (r as { level?: PracticeLevel }).level === level)
    .filter((r) => !dismissedAt || (r.completedAt ?? "") > dismissedAt)
    .map((r) => rateRow(type, r))
    .filter((r): r is ResultRating => r != null);
  return suggestLevelChange(level, ratings);
}
