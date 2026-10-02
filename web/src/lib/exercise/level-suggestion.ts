import { listCompletedExercises } from "@/lib/db/exercises";
import { getAppSettings } from "@/lib/db/settings";
import { isAnalyticalExercise } from "@/lib/types/exercise";
import { analyticalResultOf } from "@/lib/exercise/analytical-score";
import { rateAnalytical } from "@/lib/exercise/analytical-levels";
import { suggestLevelChange, type LevelSuggestion, type PracticeLevel } from "@/lib/exercise/levels";

/** How many recent finished exercises to look at; streaks need at most 3. */
const LOOKBACK = 30;

/**
 * Level suggestion after finishing an analytical exercise: rates the plain passages
 * finished at `level` since the last "Not now", newest first.
 */
export async function analyticalLevelSuggestion(level: PracticeLevel): Promise<LevelSuggestion> {
  const [rows, settings] = await Promise.all([
    listCompletedExercises({ type: "analytical" }, LOOKBACK),
    getAppSettings(),
  ]);
  const dismissedAt = settings.levelSuggestionDismissedAt?.analytical;
  const ratings = rows
    .filter(isAnalyticalExercise)
    .filter((r) => !r.isGeopolitics && r.level === level)
    .filter((r) => !dismissedAt || (r.completedAt ?? "") > dismissedAt)
    .map((r) => rateAnalytical(analyticalResultOf(r)));
  return suggestLevelChange(level, ratings);
}
