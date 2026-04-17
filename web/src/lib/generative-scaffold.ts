import type { GenerativeStage } from "@/lib/ai/validators/generative";

/** First 3 completed generative exercises → edit; next 4 → hint; then independent (ai_plan §4.3). */
export function getGenerativeStageFromCompletedCount(completedCount: number): GenerativeStage {
  if (completedCount < 3) return "edit";
  if (completedCount < 7) return "hint";
  return "independent";
}
