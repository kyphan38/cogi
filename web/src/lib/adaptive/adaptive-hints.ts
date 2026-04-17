import { getPerformanceSnapshotForThinkingType } from "@/lib/adaptive/performance-profile";
import type { AdaptiveExerciseType, AdaptiveHintsPayload } from "@/lib/adaptive/types";
import { listActiveWeaknessTypes } from "@/lib/db/weaknesses";
import { getAppSettings } from "@/lib/db/settings";

const MAX_INJECT = 3;

export async function buildAdaptiveHintsForRequest(
  exerciseType: AdaptiveExerciseType,
): Promise<AdaptiveHintsPayload> {
  const s = await getAppSettings();
  if (s.adaptiveDifficultyEnabled !== true) {
    return {
      enabled: false,
      exerciseType,
      tier: null,
      rollingAccuracy: null,
      sampleCount: 0,
      weaknessTypesToInject: [],
    };
  }
  const snap = await getPerformanceSnapshotForThinkingType(exerciseType);
  const weaknessTypesToInject = await listActiveWeaknessTypes(exerciseType, MAX_INJECT);
  return {
    enabled: true,
    exerciseType,
    tier: snap.tier,
    rollingAccuracy: snap.rollingMean,
    sampleCount: snap.sampleCount,
    weaknessTypesToInject,
  };
}
