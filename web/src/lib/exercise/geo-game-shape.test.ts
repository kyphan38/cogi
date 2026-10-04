import { describe, expect, it } from "vitest";
import { geoGameShapeErrors, realNamesUsed } from "./geo-game-shape";
import type { GameCell } from "./game";
import { validateGeoStrategySemantics, type StrategyExercisePayload } from "@/lib/ai/validators/strategy";
import { buildGeoStrategyPrompt } from "@/lib/ai/prompts/strategy";
import { STRATEGY_LEVELS } from "./strategy-levels";
import { geoGameCaseById } from "@/lib/geo/game-cases";

/** a1/b1 = the "firm" or "cooperate" choice as noted per game. Payoffs [A, B]. */
function game(p: { a1b1: [number, number]; a1b2: [number, number]; a2b1: [number, number]; a2b2: [number, number] }): GameCell[] {
  return (Object.entries(p) as [string, [number, number]][]).map(([k, [pa, pb]]) => ({
    a: k.slice(0, 2),
    b: k.slice(2),
    payoffA: pa,
    payoffB: pb,
  }));
}

const A = ["a1", "a2"];
const B = ["b1", "b2"];

// a1/b1 = stand firm, a2/b2 = back down.
const chicken = game({ a1b1: [0, 0], a1b2: [9, 2], a2b1: [2, 9], a2b2: [6, 6] });
// a1/b1 = selfish, a2/b2 = hold back.
const dilemma = game({ a1b1: [3, 3], a1b2: [9, 1], a2b1: [1, 9], a2b2: [7, 7] });
// a1/b1 = cooperate, a2/b2 = play safe.
const stagHunt = game({ a1b1: [9, 9], a1b2: [0, 5], a2b1: [5, 0], a2b2: [4, 4] });
// b1 = free ride (dominant for B).
const freeRider = game({ a1b1: [3, 8], a1b2: [8, 6], a2b1: [4, 9], a2b2: [6, 7] });

describe("geo game shapes", () => {
  it("accepts the classic shapes", () => {
    expect(geoGameShapeErrors("chicken", A, B, chicken)).toEqual([]);
    expect(geoGameShapeErrors("prisoners_dilemma", A, B, dilemma)).toEqual([]);
    expect(geoGameShapeErrors("stag_hunt", A, B, stagHunt)).toEqual([]);
    expect(geoGameShapeErrors("free_rider", A, B, freeRider)).toEqual([]);
    expect(geoGameShapeErrors("alliance", A, B, dilemma)).toEqual([]);
  });

  it("rejects a game that has the wrong shape for its case", () => {
    expect(geoGameShapeErrors("chicken", A, B, stagHunt)[0]).toContain("chicken");
    expect(geoGameShapeErrors("stag_hunt", A, B, chicken)[0]).toContain("stag hunt");
    expect(geoGameShapeErrors("prisoners_dilemma", A, B, stagHunt)[0]).toContain("prisoner's dilemma");
    expect(geoGameShapeErrors("free_rider", A, B, chicken)[0]).toContain("free-rider");
  });

  it("finds real names as whole words, in any case", () => {
    expect(realNamesUsed(["The SOVIET fleet waited.", "Norland sails."], ["Soviet", "Cuba"])).toEqual(["Soviet"]);
    expect(realNamesUsed(["Incubator"], ["Cuba"])).toEqual([]);
  });
});

function payload(over: Partial<StrategyExercisePayload> = {}): StrategyExercisePayload {
  return {
    title: "Ships at the strait",
    scenario: "Suppose Norland finds that Estova has placed rockets on an island near its coast.",
    concepts: [
      { term: "Best reply", plain: "p", example: "e" },
      { term: "Nash equilibrium", plain: "p", example: "e" },
      { term: "Deterrence", plain: "p", example: "e" },
    ],
    conceptChecks: [{ question: "q", options: ["x", "y", "z"], answerIndex: 0, explanation: "e" }],
    players: [
      { id: "A", name: "Norland", goal: "Get the rockets removed." },
      { id: "B", name: "Estova", goal: "Keep its ally safe." },
    ],
    optionsA: [
      { id: "a1", label: "Keep up the blockade" },
      { id: "a2", label: "Ease off" },
    ],
    optionsB: [
      { id: "b1", label: "Keep the rockets" },
      { id: "b2", label: "Remove the rockets" },
    ],
    cells: chicken.map((c) => ({ ...c, story: "Something happens to both." })),
    gameType: "chicken",
    insight: "Leaving a way out helps both sides.",
    ...over,
  };
}

describe("geopolitical game validator and prompt", () => {
  const cuba = geoGameCaseById("cuba-1962")!;

  it("accepts a made-up chicken story", () => {
    expect(validateGeoStrategySemantics(payload(), cuba)).toEqual([]);
  });

  it("asks for a story that starts with Suppose and uses no real names", () => {
    const errors = validateGeoStrategySemantics(payload({ scenario: "In 1962 Khrushchev placed missiles in Cuba." }), cuba);
    expect(errors.join(" ")).toContain('start with "Suppose"');
    expect(errors.join(" ")).toContain("Cuba, Khrushchev");
  });

  it("rejects a story whose payoffs do not make a game of chicken", () => {
    const errors = validateGeoStrategySemantics(payload({ cells: stagHunt.map((c) => ({ ...c, story: "x" })) }), cuba);
    expect(errors[0]).toContain("chicken");
  });

  it("builds the prompt from the fixed case and asks for made-up names", () => {
    const prompt = buildGeoStrategyPrompt({ gameCase: cuba, level: STRATEGY_LEVELS.standard });
    expect(prompt).toContain("The Cuban Missile Crisis (October 1962)");
    expect(prompt).toContain("Player A plays the role of United States");
    expect(prompt).toContain('must start with "Suppose"');
    expect(prompt).toContain("Never use real countries");
    expect(prompt).toContain('"gameType": "chicken"');
  });
});
