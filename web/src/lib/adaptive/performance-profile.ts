import { accuracyToTierLabel } from "@/lib/adaptive/difficulty-tier";
import type { DifficultyTierLabel } from "@/lib/adaptive/types";
import type { AdaptiveExerciseType } from "@/lib/adaptive/types";
import { getConfidenceRecordForExercise, listCompletedExercises } from "@/lib/db/exercises";

export const ROLLING_WINDOW = 10;
export const MIN_SAMPLES_FOR_TIER = 3;

export interface PerformanceSnapshot {
  rollingMean: number | null;
  sampleCount: number;
  tier: DifficultyTierLabel | null;
}

export async function getPerformanceSnapshotForThinkingType(
  type: AdaptiveExerciseType,
): Promise<PerformanceSnapshot> {
  const recent = (await listCompletedExercises({ type })).slice(0, ROLLING_WINDOW);
  const accs: number[] = [];
  for (const ex of recent) {
    const c = await getConfidenceRecordForExercise(ex.id);
    if (c && Number.isFinite(c.actualAccuracy)) accs.push(c.actualAccuracy);
  }
  const sampleCount = accs.length;
  if (sampleCount === 0) {
    return { rollingMean: null, sampleCount: 0, tier: null };
  }
  const rollingMean = Math.round(accs.reduce((s, n) => s + n, 0) / accs.length);
  const tier =
    sampleCount >= MIN_SAMPLES_FOR_TIER ? accuracyToTierLabel(rollingMean) : null;
  return { rollingMean, sampleCount, tier };
}
