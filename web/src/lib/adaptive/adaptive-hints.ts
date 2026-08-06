import { getPerformanceSnapshotForThinkingType } from "@/lib/adaptive/performance-profile";
import type { AdaptiveExerciseType, AdaptiveHintsPayload } from "@/lib/adaptive/types";
import { listActiveWeaknessTypes } from "@/lib/db/weaknesses";
import { getAppSettings } from "@/lib/db/settings";
import { DEFAULT_LANGUAGE_LEVEL, type LanguageLevel } from "@/lib/adaptive/language-level";

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
  // Manual difficulty bar (nested under the adaptive-difficulty toggle) overrides the
  // computed accuracy-based tier while still reporting real accuracy/sample-count context.
  const tier =
    s.manualDifficultyEnabled === true && s.manualDifficultyTier ? s.manualDifficultyTier : snap.tier;
  return {
    enabled: true,
    exerciseType,
    tier,
    rollingAccuracy: snap.rollingMean,
    sampleCount: snap.sampleCount,
    weaknessTypesToInject,
  };
}

/** Language-complexity bar (Settings) - independent axis, read for every request regardless of adaptive-difficulty state. */
export async function getLanguageLevelForRequest(): Promise<LanguageLevel> {
  const s = await getAppSettings();
  return s.languageLevel ?? DEFAULT_LANGUAGE_LEVEL;
}
