/**
 * Generative calibration per ai_plan.txt §1.3b (~310): not binary — AI rubric 0–100.
 * The numeric score is produced server-side (POST /api/ai/generative-rubric) and stored
 * on GenerativeExerciseRow.rubricScore. Use this helper to clamp for ConfidenceRecord.actualAccuracy.
 */

export function generativeRubricToAccuracy(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
