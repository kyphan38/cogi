import { analyzeGame, cellsFromRanks, rankCells, type GameCell, type GameFacts } from "@/lib/exercise/game";
import type { ResultRating } from "@/lib/exercise/levels";

/** The user's answers on a strategic situation. */
export interface StrategyAnswers {
  /** Guided: best reply per question, key "A:<b id>" -> a id, "B:<a id>" -> b id. */
  bestReplies?: Record<string, string>;
  /** Standard / Expert: each player's outcomes (cell keys), best first. */
  ranks?: { A: string[]; B: string[] };
  /** Cells the user thinks the players end up in. */
  prediction: string[];
  /** Expert: each player's dominant choice, or "none". */
  dominant?: { A: string; B: string };
  /** Expert: cells better for both than the predicted outcome (empty = none). */
  betterForBoth?: string[];
}

export interface StrategyResult {
  facts: GameFacts;
  bestReplies: { key: string; given: string | null; correct: boolean }[];
  /** 0..1 per player: how close the user's ranking is to the model's. */
  rankCloseness: { A: number; B: number } | null;
  /** Equilibria implied by the user's own ranking (null at Guided). */
  impliedNash: string[] | null;
  /** The prediction is exactly the model's equilibria. */
  predictionCorrect: boolean;
  /** The prediction follows from the user's own ranking, even if it differs from the model. */
  predictionConsistent: boolean | null;
  dominant: { A: boolean; B: boolean } | null;
  betterCorrect: boolean | null;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** 1 = same order, 0 = reversed (the largest total rank distance). */
export function rankCloseness(user: string[], model: string[]): number {
  const n = model.length;
  const distance = model.reduce((sum, key, i) => {
    const at = user.indexOf(key);
    return sum + Math.abs((at < 0 ? n - 1 : at) - i);
  }, 0);
  const max = Math.floor((n * n) / 2);
  return max > 0 ? Math.round((1 - distance / max) * 100) / 100 : 1;
}

export function scoreStrategy(input: {
  aOptions: string[];
  bOptions: string[];
  cells: GameCell[];
  answers: StrategyAnswers;
}): StrategyResult {
  const { aOptions, bOptions, cells, answers } = input;
  const facts = analyzeGame(aOptions, bOptions, cells);
  const bestReplies = answers.bestReplies
    ? [
        ...bOptions.map((b) => ({ key: `A:${b}`, want: facts.bestA[b]! })),
        ...aOptions.map((a) => ({ key: `B:${a}`, want: facts.bestB[a]! })),
      ].map(({ key, want }) => {
        const given = answers.bestReplies?.[key] ?? null;
        return { key, given, correct: given === want };
      })
    : [];
  const ranks = answers.ranks;
  const impliedNash = ranks ? analyzeGame(aOptions, bOptions, cellsFromRanks(aOptions, bOptions, ranks.A, ranks.B)).nash : null;
  return {
    facts,
    bestReplies,
    rankCloseness: ranks
      ? { A: rankCloseness(ranks.A, rankCells(cells, "A")), B: rankCloseness(ranks.B, rankCells(cells, "B")) }
      : null,
    impliedNash,
    predictionCorrect: sameSet(answers.prediction, facts.nash),
    predictionConsistent: impliedNash ? sameSet(answers.prediction, impliedNash) : null,
    dominant: answers.dominant
      ? {
          A: answers.dominant.A === (facts.dominantA ?? "none"),
          B: answers.dominant.B === (facts.dominantB ?? "none"),
        }
      : null,
    betterCorrect: answers.betterForBoth ? sameSet(answers.betterForBoth, facts.betterForBoth) : null,
  };
}

/** Game theory has answers: good with the right outcome and 75%+ of the steps; poor with neither. */
export function rateStrategy(r: StrategyResult): ResultRating {
  const steps =
    r.bestReplies.length > 0
      ? r.bestReplies.filter((b) => b.correct).length / r.bestReplies.length
      : r.rankCloseness
        ? (r.rankCloseness.A + r.rankCloseness.B) / 2
        : 0;
  if (r.predictionCorrect && steps >= 0.75) return "good";
  if (!r.predictionCorrect && steps <= 0.5) return "poor";
  return "ok";
}

/**
 * Coaching refs: `br_<player>_<option>` (Guided best replies), `rank_A` / `rank_B`,
 * `prediction`, `dominant_A` / `dominant_B`, `better`. Required: wrong best replies,
 * rankings not identical to the model, the prediction, wrong extra answers.
 */
export function strategyCoachingRefs(r: StrategyResult): { required: string[]; allowed: string[] } {
  const br = r.bestReplies.map((b) => `br_${b.key.replace(":", "_")}`);
  const allowed = [
    ...br,
    ...(r.rankCloseness ? ["rank_A", "rank_B"] : []),
    "prediction",
    ...(r.dominant ? ["dominant_A", "dominant_B"] : []),
    ...(r.betterCorrect !== null ? ["better"] : []),
  ];
  const required = [
    ...r.bestReplies.filter((b) => !b.correct).map((b) => `br_${b.key.replace(":", "_")}`),
    ...(r.rankCloseness ? (["A", "B"] as const).filter((p) => r.rankCloseness![p] < 1).map((p) => `rank_${p}`) : []),
    "prediction",
    ...(r.dominant ? (["A", "B"] as const).filter((p) => !r.dominant![p]).map((p) => `dominant_${p}`) : []),
    ...(r.betterCorrect === false ? ["better"] : []),
  ];
  return { required, allowed };
}
