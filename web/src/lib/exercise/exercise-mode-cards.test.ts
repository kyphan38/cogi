import { describe, expect, it } from "vitest";
import { ALL_EXERCISE_CARDS, EXERCISE_GROUPS, PRACTICE_EXERCISE_TYPES } from "./exercise-mode-cards";

describe("EXERCISE_GROUPS", () => {
  it("lists every practice type exactly once", () => {
    const listed = EXERCISE_GROUPS.flatMap((g) => g.types);
    expect([...listed].sort()).toEqual([...PRACTICE_EXERCISE_TYPES].sort());
  });

  it("has a short line for every card", () => {
    for (const c of ALL_EXERCISE_CARDS) expect(c.desc.split(" ").length, c.type).toBeLessThanOrEqual(8);
  });
});
