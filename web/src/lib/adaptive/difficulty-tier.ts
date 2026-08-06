import type { DifficultyTierLabel } from "@/lib/adaptive/types";

/** Ordered low → high, for the manual difficulty bar UI. */
export const DIFFICULTY_TIERS: readonly DifficultyTierLabel[] = [
  "Foundation",
  "Practitioner",
  "Advanced",
  "Expert",
] as const;

/**
 * Phase 7.1 - map rolling mean `actualAccuracy` (0–100) to a learner-facing band.
 * Thresholds align with ai_plan.txt “Foundation → Expert” progression.
 */
export function accuracyToTierLabel(mean: number): DifficultyTierLabel {
  if (mean < 52) return "Foundation";
  if (mean < 67) return "Practitioner";
  if (mean < 82) return "Advanced";
  return "Expert";
}
