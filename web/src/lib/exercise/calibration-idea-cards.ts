import type { CalibrationResult } from "@/lib/exercise/calibration-score";
import type { CalibrationIdea } from "@/lib/exercise/calibration-idea-guide";
import { firstKeys } from "@/lib/exercise/take-with-you";

/** How far below the target a range hit rate may be before ranges get a card (points). */
const RANGE_SLACK = 15;

/**
 * Which calibration ideas get a "Take with you" card, decided in code so the server
 * prompt and the answer key agree: confident misses, ranges that missed too often, a
 * wrong base rate, then signs of underconfidence, then keeping score.
 */
export function pickCalibrationCards(r: CalibrationResult): CalibrationIdea[] {
  const confidentMiss = r.items.some((o) => o.kind === "binary" && o.answered && !o.correct && (o.confidence ?? 0) >= 80);
  const hitRate = r.interval.count > 0 ? (r.interval.hits / r.interval.count) * 100 : null;
  const rangesMissed = hitRate != null && hitRate < r.interval.target - RANGE_SLACK;
  const baseRateMissed = r.baseRate.right < r.baseRate.count;
  const low = r.binary.buckets.filter((b) => b.confidence <= 60);
  const lowCount = low.reduce((n, b) => n + b.count, 0);
  const lowRight = low.reduce((n, b) => n + b.right, 0);
  const tooUnsure =
    (lowCount >= 3 && lowRight / lowCount >= 0.8) ||
    (r.interval.count > 0 && r.interval.hits === r.interval.count && r.interval.veryWide >= r.interval.count / 2);
  return firstKeys([
    confidentMiss ? "overconfidence" : null,
    rangesMissed ? "wide_ranges" : null,
    baseRateMissed ? "base_rates" : null,
    tooUnsure ? "underconfidence" : null,
    "keep_score",
    r.baseRate.count > 0 ? "base_rates" : null,
  ]) as CalibrationIdea[];
}
