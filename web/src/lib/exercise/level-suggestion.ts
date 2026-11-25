import { listCompletedExercises } from "@/lib/db/exercises";
import { getAppSettings } from "@/lib/db/settings";
import { isCalibrationExercise } from "@/lib/types/exercise";
import { rateExercise } from "@/lib/exercise/rate-exercise";
import { suggestCalibrationLevel } from "@/lib/exercise/calibration-score";
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
  const atLevel = rows
    .filter((r) => (r as { level?: PracticeLevel }).level === level)
    .filter((r) => !dismissedAt || (r.completedAt ?? "") > dismissedAt);
  if (type === "calibration") {
    const results = atLevel.flatMap((r) => (isCalibrationExercise(r) && r.result ? [r.result] : []));
    return suggestCalibrationLevel(level, results);
  }
  const ratings = atLevel
    .map((r) => (r.type === type ? rateExercise(r) : null))
    .filter((r): r is ResultRating => r != null);
  return suggestLevelChange(level, ratings);
}
