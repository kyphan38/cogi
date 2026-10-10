import type { StrategyResult } from "@/lib/exercise/strategy-score";
import type { StrategyIdea } from "@/lib/exercise/strategy-idea-guide";
import { firstKeys } from "@/lib/exercise/take-with-you";

/** A ranking this far from the model's means the preferences were read differently. */
const LOW_CLOSENESS = 0.67;

/**
 * Which game theory ideas get a "Take with you" card, decided in code so the server
 * prompt and the answer key agree: first what the user missed (best replies or
 * preferences, the outcome, a dominant choice, the better-for-both outcome), then the
 * idea this game shows best.
 */
export function pickStrategyCards(result: StrategyResult): StrategyIdea[] {
  const f = result.facts;
  const repliesMissed =
    result.bestReplies.some((b) => !b.correct) ||
    (result.rankCloseness != null && Math.min(result.rankCloseness.A, result.rankCloseness.B) < LOW_CLOSENESS);
  const several = f.nash.length > 1;
  const dilemma = f.nash.length === 1 && f.betterForBoth.length > 0;
  return firstKeys([
    repliesMissed ? "best_reply" : null,
    !result.predictionCorrect ? (several ? "two_equilibria" : "equilibrium") : null,
    result.dominant && (!result.dominant.A || !result.dominant.B) ? "dominant_choice" : null,
    result.betterCorrect === false ? "better_for_both" : null,
    dilemma ? "better_for_both" : null,
    several ? "two_equilibria" : null,
    f.dominantA || f.dominantB ? "dominant_choice" : null,
    "equilibrium",
    "best_reply",
  ]) as StrategyIdea[];
}
