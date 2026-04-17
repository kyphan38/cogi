import type { ThinkingType } from "@/lib/types/exercise";

export type DifficultyTierLabel = "Foundation" | "Practitioner" | "Advanced" | "Expert";

export type AdaptiveExerciseType = Exclude<ThinkingType, "combo">;

/** Client → `POST /api/ai` (IndexedDB stays client-side; hints are advisory). */
export interface AdaptiveHintsPayload {
  enabled: boolean;
  exerciseType: AdaptiveExerciseType;
  tier: DifficultyTierLabel | null;
  rollingAccuracy: number | null;
  sampleCount: number;
  weaknessTypesToInject: string[];
}
