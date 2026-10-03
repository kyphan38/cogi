import { describe, expect, it } from "vitest";
import { analyzeGame, cellKey, cellsFromRanks, rankCells, type GameCell } from "./game";

const A = ["a1", "a2"]; // a1 = cooperate, a2 = defect
const B = ["b1", "b2"];
const cell = (a: string, b: string, payoffA: number, payoffB: number): GameCell => ({ a, b, payoffA, payoffB });

describe("analyzeGame", () => {
  it("prisoner's dilemma: both defect, both would be better cooperating", () => {
    const pd = [cell("a1", "b1", 6, 6), cell("a1", "b2", 0, 9), cell("a2", "b1", 9, 0), cell("a2", "b2", 2, 2)];
    const g = analyzeGame(A, B, pd);
    expect(g.bestA).toEqual({ b1: "a2", b2: "a2" });
    expect(g.bestB).toEqual({ a1: "b2", a2: "b2" });
    expect(g.nash).toEqual([cellKey("a2", "b2")]);
    expect(g.dominantA).toBe("a2");
    expect(g.dominantB).toBe("b2");
    expect(g.betterForBoth).toEqual([cellKey("a1", "b1")]);
  });

  it("coordination: two equilibria, no dominant choice", () => {
    const co = [cell("a1", "b1", 8, 8), cell("a1", "b2", 1, 1), cell("a2", "b1", 0, 0), cell("a2", "b2", 5, 5)];
    const g = analyzeGame(A, B, co);
    expect(g.nash).toEqual(["a1|b1", "a2|b2"]);
    expect(g.dominantA).toBeNull();
    expect(g.betterForBoth).toEqual([]);
  });

  it("works with three options for A", () => {
    const three = [
      cell("a1", "b1", 3, 2), cell("a1", "b2", 1, 4),
      cell("a2", "b1", 5, 1), cell("a2", "b2", 4, 3),
      cell("a3", "b1", 2, 6), cell("a3", "b2", 0, 5),
    ];
    const g = analyzeGame(["a1", "a2", "a3"], B, three);
    expect(g.bestA).toEqual({ b1: "a2", b2: "a2" });
    expect(g.nash).toEqual(["a2|b2"]);
    expect(g.dominantA).toBe("a2");
  });
});

describe("cellsFromRanks / rankCells", () => {
  it("round-trips a ranking", () => {
    const rankA = ["a2|b1", "a1|b1", "a2|b2", "a1|b2"];
    const rankB = ["a1|b2", "a1|b1", "a2|b2", "a2|b1"];
    const cells = cellsFromRanks(A, B, rankA, rankB);
    expect(rankCells(cells, "A")).toEqual(rankA);
    expect(rankCells(cells, "B")).toEqual(rankB);
    // These ranks are a prisoner's dilemma.
    expect(analyzeGame(A, B, cells).nash).toEqual(["a2|b2"]);
  });
});
