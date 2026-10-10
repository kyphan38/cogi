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
  /** Some of the equilibria picked and no other cell: e.g. 1 of 2. Absent on older results. */
  predictionPartial?: boolean;
  /** How many of the model's equilibria the prediction includes. Absent on older results. */
  predictionFound?: number;
  /** The prediction follows from the user's own ranking, even if it differs from the model. */
  predictionConsistent: boolean | null;
  dominant: { A: boolean; B: boolean } | null;
  betterCorrect: boolean | null;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/**
 * The share of pairs of outcomes the user put in the model's order: 1 = same order,
 * 0 = reversed. Pairs, like Life situations: a rank-distance score gives only a few
 * steps and drops a lot for one swap at the top. Outcomes left out count as last.
 */
export function rankCloseness(user: string[], model: string[]): number {
  const at = (key: string) => {
    const i = user.indexOf(key);
    return i < 0 ? user.length : i;
  };
  let agree = 0;
  let total = 0;
  for (let i = 0; i < model.length; i++) {
    for (let j = i + 1; j < model.length; j++) {
      total += 1;
      if (at(model[i]!) < at(model[j]!)) agree += 1;
    }
  }
  return total > 0 ? Math.round((agree / total) * 100) / 100 : 1;
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
    predictionFound: answers.prediction.filter((k) => facts.nash.includes(k)).length,
    predictionPartial:
      !sameSet(answers.prediction, facts.nash) &&
      answers.prediction.length > 0 &&
      answers.prediction.every((k) => facts.nash.includes(k)),
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

/**
 * Game theory has answers: good with the right outcome and 75%+ of the steps; poor with
 * neither. One of two equilibria found (and nothing else) is neither good nor poor.
 */
export function rateStrategy(r: StrategyResult): ResultRating {
  const steps =
    r.bestReplies.length > 0
      ? r.bestReplies.filter((b) => b.correct).length / r.bestReplies.length
      : r.rankCloseness
        ? (r.rankCloseness.A + r.rankCloseness.B) / 2
        : 0;
  if (r.predictionCorrect && steps >= 0.75) return "good";
  if (!r.predictionCorrect && !r.predictionPartial && steps <= 0.5) return "poor";
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
