import { describe, expect, it } from "vitest";
import { STRATEGY_IDEA_GUIDE, STRATEGY_IDEAS } from "./strategy-idea-guide";
import { pickStrategyCards } from "./strategy-idea-cards";
import { scoreStrategy } from "./strategy-score";
import type { GameCell } from "./game";

const A = ["a1", "a2"];
const B = ["b1", "b2"];
const pd: GameCell[] = [
  { a: "a1", b: "b1", payoffA: 7, payoffB: 7 },
  { a: "a1", b: "b2", payoffA: 1, payoffB: 10 },
  { a: "a2", b: "b1", payoffA: 10, payoffB: 1 },
  { a: "a2", b: "b2", payoffA: 3, payoffB: 3 },
];
const stag: GameCell[] = [
  { a: "a1", b: "b1", payoffA: 9, payoffB: 9 },
  { a: "a1", b: "b2", payoffA: 1, payoffB: 6 },
  { a: "a2", b: "b1", payoffA: 6, payoffB: 1 },
  { a: "a2", b: "b2", payoffA: 3, payoffB: 3 },
];
const right = { "A:b1": "a2", "A:b2": "a2", "B:a1": "b2", "B:a2": "b2" };

describe("strategy idea guide", () => {
  it("covers every idea, with every field filled", () => {
    for (const k of STRATEGY_IDEAS) {
      const g = STRATEGY_IDEA_GUIDE[k];
      for (const v of [g.spot, g.ask, g.fix, g.othersTip, g.practice]) expect(v.trim().length, k).toBeGreaterThan(10);
      expect(g.signals.length, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pickStrategyCards", () => {
  it("all right in a dilemma: better for both, then dominant choice", () => {
    const r = scoreStrategy({ aOptions: A, bOptions: B, cells: pd, answers: { bestReplies: right, prediction: ["a2|b2"] } });
    expect(pickStrategyCards(r)).toEqual(["better_for_both", "dominant_choice"]);
  });

  it("puts missed best replies and a missed outcome first", () => {
    const r = scoreStrategy({
      aOptions: A, bOptions: B, cells: pd,
      answers: { bestReplies: { ...right, "B:a1": "b1" }, prediction: ["a1|b1"] },
    });
    expect(pickStrategyCards(r)).toEqual(["best_reply", "equilibrium"]);
  });

  it("a game with two equilibria points at where it can settle", () => {
    const stagRight = { "A:b1": "a1", "A:b2": "a2", "B:a1": "b1", "B:a2": "b2" };
    const r = scoreStrategy({ aOptions: A, bOptions: B, cells: stag, answers: { bestReplies: stagRight, prediction: ["a1|b1"] } });
    expect(pickStrategyCards(r)[0]).toBe("two_equilibria");
  });
});
