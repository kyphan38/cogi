import { describe, expect, it } from "vitest";
import { validateStrategySemantics, type StrategyExercisePayload } from "./strategy";
import { buildStrategyGenerationPrompt } from "@/lib/ai/prompts/strategy";
import { CLASSIC_GAME_TYPES, pickStrategyGameType, STRATEGY_LEVELS } from "@/lib/exercise/strategy-levels";

/** Prices: each shop does best cutting whatever the other does; both keeping prices is better for both. */
function payload(cells: [number, number, number, number][] = [
  [6, 6, 0, 0],
  [1, 9, 0, 0],
  [9, 1, 0, 0],
  [3, 3, 0, 0],
]): StrategyExercisePayload {
  const keys = [["a1", "b1"], ["a1", "b2"], ["a2", "b1"], ["a2", "b2"]] as const;
  return {
    title: "Price war",
    scenario: "Two food trucks on one street choose prices for the weekend.",
    concepts: [
      { term: "Best reply", plain: "Your best choice given the other's choice.", example: "Bring an umbrella if rain is forecast." },
      { term: "Dominant strategy", plain: "Best whatever the other does.", example: "Wear a seat belt." },
      { term: "Nash equilibrium", plain: "No one wants to change alone.", example: "Driving on the same side." },
    ],
    conceptChecks: [{ question: "What is a best reply?", options: ["Best given the other's choice", "Always cooperate", "Copy them"], answerIndex: 0, explanation: "It depends on the other." }],
    players: [
      { id: "A", name: "Truck A", goal: "Profit" },
      { id: "B", name: "Truck B", goal: "Profit" },
    ],
    optionsA: [{ id: "a1", label: "Keep price" }, { id: "a2", label: "Cut price" }],
    optionsB: [{ id: "b1", label: "Keep price" }, { id: "b2", label: "Cut price" }],
    cells: keys.map(([a, b], i) => ({ a, b, payoffA: cells[i]![0], payoffB: cells[i]![1], story: "s" })),
    gameType: "prisoners_dilemma",
    insight: "Each side cuts, and both lose.",
  };
}

describe("validateStrategySemantics", () => {
  it("accepts a real prisoner's dilemma", () => {
    expect(validateStrategySemantics(payload(), { aOptionCount: 2 })).toEqual([]);
  });

  it("rejects a game labeled as a classic shape that it does not have", () => {
    // Both keeping the price is now best for each: a coordination-like game, not a dilemma.
    const p = payload([
      [9, 9, 0, 0],
      [1, 6, 0, 0],
      [6, 1, 0, 0],
      [3, 3, 0, 0],
    ]);
    expect(validateStrategySemantics(p, { aOptionCount: 2 }).join("\n")).toMatch(/Make it a prisoner's dilemma/);
    expect(validateStrategySemantics({ ...p, gameType: "stag_hunt" }, { aOptionCount: 2 })).toEqual([]);
    expect(validateStrategySemantics({ ...p, gameType: "other" }, { aOptionCount: 2 })).toEqual([]);
  });

  it("checks a coordination game for two matching equilibria", () => {
    const coord = payload([
      [8, 8, 0, 0],
      [2, 2, 0, 0],
      [1, 1, 0, 0],
      [6, 6, 0, 0],
    ]);
    expect(validateStrategySemantics({ ...coord, gameType: "coordination" }, { aOptionCount: 2 })).toEqual([]);
    expect(validateStrategySemantics({ ...payload(), gameType: "coordination" }, { aOptionCount: 2 }).join("\n")).toMatch(/Make it a coordination game/);
  });
});

describe("game type picked in code", () => {
  it("picks every classic shape for 2x2 levels and leaves Expert to the model", () => {
    const steps = [0, 0.3, 0.6, 0.99];
    const picks = steps.map((r) => pickStrategyGameType(STRATEGY_LEVELS.standard, () => r));
    expect(picks).toEqual([...CLASSIC_GAME_TYPES]);
    expect(pickStrategyGameType(STRATEGY_LEVELS.guided, () => 0.5)).toBe("chicken");
    expect(pickStrategyGameType(STRATEGY_LEVELS.expert)).toBeUndefined();
  });

  it("rejects a game that is not the picked type", () => {
    expect(validateStrategySemantics(payload(), { aOptionCount: 2, gameType: "chicken" })).toContain('gameType must be "chicken"');
    expect(validateStrategySemantics(payload(), { aOptionCount: 2, gameType: "prisoners_dilemma" })).toEqual([]);
  });

  it("asks for the picked game and a story that gives facts, not outcomes", () => {
    const prompt = buildStrategyGenerationPrompt({ area: "Daily life", level: STRATEGY_LEVELS.standard, gameType: "stag_hunt" });
    expect(prompt).toContain("the shape of a stag hunt");
    expect(prompt).toContain('"gameType": "stag_hunt"');
    expect(prompt).toContain("must NOT say what happens in any outcome");
    const expert = buildStrategyGenerationPrompt({ area: "Daily life", level: STRATEGY_LEVELS.expert });
    expect(expert).toContain(STRATEGY_LEVELS.expert.gameTypes);
    expect(expert).toContain("must NOT say what happens in any outcome");
  });
});
