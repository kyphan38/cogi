import type { EvaluativeExerciseRow } from "@/lib/types/exercise";
import { BIG_GAP, type EvaluativeResult } from "@/lib/exercise/evaluative-score";
import type { EvaluativeIdea } from "@/lib/exercise/evaluative-idea-guide";
import { firstKeys } from "@/lib/exercise/take-with-you";

/**
 * Which decision ideas get a "Take with you" card, decided in code so the server prompt
 * and the answer key agree. Matrix: the two criteria first when an option was placed
 * differently. Scoring: dealbreakers when the best option differs on a dealbreaker
 * task, then big weight gaps, the stakeholders of a geopolitics case, and hidden
 * criteria. Uncertainty: expected value.
 */
export function pickEvaluativeCards(exercise: EvaluativeExerciseRow, result: EvaluativeResult): EvaluativeIdea[] {
  if (result.variant === "matrix") {
    return firstKeys([result.correct < result.total ? "two_criteria" : null, "two_criteria", "weighing"]) as EvaluativeIdea[];
  }
  if (result.variant === "uncertainty") {
    return firstKeys(["expected_value", !result.topMatch ? "hidden_criteria" : null]) as EvaluativeIdea[];
  }
  const criteria = exercise.variant === "scoring" ? exercise.criteria : [];
  const hasDealbreaker = criteria.some((c) => c.isDealbreaker);
  const geo = "stakeholderNote" in exercise && typeof exercise.stakeholderNote === "string" && exercise.stakeholderNote.trim() !== "";
  const bigWeights = result.criteria.some((c) => Math.abs(c.gap) >= BIG_GAP);
  return firstKeys([
    hasDealbreaker && !result.topMatch ? "dealbreakers" : null,
    bigWeights ? "weighing" : null,
    geo ? "stakeholders" : null,
    "hidden_criteria",
    hasDealbreaker ? "dealbreakers" : null,
    "weighing",
  ]) as EvaluativeIdea[];
}
