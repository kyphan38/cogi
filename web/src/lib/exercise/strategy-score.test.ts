import { describe, expect, it } from "vitest";
import type { GameCell } from "./game";
import { rankCloseness, rateStrategy, scoreStrategy, strategyCoachingRefs } from "./strategy-score";

const A = ["a1", "a2"];
const B = ["b1", "b2"];
const pd: GameCell[] = [
  { a: "a1", b: "b1", payoffA: 7, payoffB: 7 },
  { a: "a1", b: "b2", payoffA: 1, payoffB: 10 },
  { a: "a2", b: "b1", payoffA: 10, payoffB: 1 },
  { a: "a2", b: "b2", payoffA: 3, payoffB: 3 },
];

describe("scoreStrategy - guided", () => {
  it("checks each best reply and the predicted outcome", () => {
    const r = scoreStrategy({
      aOptions: A, bOptions: B, cells: pd,
      answers: { bestReplies: { "A:b1": "a2", "A:b2": "a2", "B:a1": "b2", "B:a2": "b1" }, prediction: ["a2|b2"] },
    });
    expect(r.bestReplies.map((b) => b.correct)).toEqual([true, true, true, false]);
    expect(r.predictionCorrect).toBe(true);
    expect(rateStrategy(r)).toBe("good");
    expect(strategyCoachingRefs(r).required).toEqual(["br_B_a2", "prediction"]);
  });

  it("rates a wrong outcome with few right steps as poor", () => {
    const r = scoreStrategy({
      aOptions: A, bOptions: B, cells: pd,
      answers: { bestReplies: { "A:b1": "a1", "A:b2": "a1", "B:a1": "b1", "B:a2": "b2" }, prediction: ["a1|b1"] },
    });
    expect(rateStrategy(r)).toBe("poor");
  });
});

describe("scoreStrategy - ranks", () => {
  it("compares rankings and checks whether the prediction follows from the user's own ranking", () => {
    // The user thinks both prefer to cooperate (a stag hunt): equilibria a1|b1 and a2|b2.
    const r = scoreStrategy({
      aOptions: A, bOptions: B, cells: pd,
      answers: {
        ranks: { A: ["a1|b1", "a2|b1", "a2|b2", "a1|b2"], B: ["a1|b1", "a1|b2", "a2|b2", "a2|b1"] },
        prediction: ["a1|b1", "a2|b2"],
        dominant: { A: "a2", B: "none" },
        betterForBoth: ["a1|b1"],
      },
    });
    // One swapped pair of 6 for each player.
    expect(r.rankCloseness).toEqual({ A: 0.83, B: 0.83 });
    expect(r.impliedNash).toEqual(["a1|b1", "a2|b2"]);
    expect(r.predictionCorrect).toBe(false);
    expect(r.predictionConsistent).toBe(true);
    expect(r.dominant).toEqual({ A: true, B: false });
    expect(r.betterCorrect).toBe(true);
    expect(strategyCoachingRefs(r).required).toEqual(["rank_A", "rank_B", "prediction", "dominant_B"]);
  });
});

describe("rankCloseness", () => {
  it("is 1 for the same order and 0 for the reverse", () => {
    expect(rankCloseness(["x", "y", "z", "w"], ["x", "y", "z", "w"])).toBe(1);
    expect(rankCloseness(["w", "z", "y", "x"], ["x", "y", "z", "w"])).toBe(0);
    // Swapping the top two costs one pair of six, not a quarter of the score.
    expect(rankCloseness(["y", "x", "z", "w"], ["x", "y", "z", "w"])).toBe(0.83);
  });
});

describe("scoreStrategy - two equilibria", () => {
  // Stag hunt: a1|b1 and a2|b2 are both equilibria.
  const stag: GameCell[] = [
    { a: "a1", b: "b1", payoffA: 9, payoffB: 9 },
    { a: "a1", b: "b2", payoffA: 1, payoffB: 6 },
    { a: "a2", b: "b1", payoffA: 6, payoffB: 1 },
    { a: "a2", b: "b2", payoffA: 3, payoffB: 3 },
  ];
  const score = (prediction: string[]) =>
    scoreStrategy({ aOptions: A, bOptions: B, cells: stag, answers: { bestReplies: {}, prediction } });

  it("counts one of two equilibria as partly right, but not with a wrong cell", () => {
    expect(score(["a1|b1"])).toMatchObject({ predictionCorrect: false, predictionPartial: true, predictionFound: 1 });
    expect(score(["a1|b1", "a1|b2"])).toMatchObject({ predictionPartial: false, predictionFound: 1 });
    expect(score(["a1|b1", "a2|b2"])).toMatchObject({ predictionCorrect: true, predictionPartial: false, predictionFound: 2 });
  });
});
