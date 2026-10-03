import { describe, expect, it } from "vitest";
import { PRACTICE_EXERCISE_TYPES } from "@/lib/exercise/exercise-mode-cards";
import { HANDBOOK_ENTRIES, HANDBOOK_GROUPS } from "./content";

describe("Handbook content", () => {
  it("has an entry for every exercise type in the app (add one when you add a type)", () => {
    for (const type of PRACTICE_EXERCISE_TYPES) {
      expect(HANDBOOK_ENTRIES.some((e) => e.exerciseType === type), `missing Handbook entry for "${type}"`).toBe(true);
    }
  });

  it("fills every section and uses unique anchors in known groups", () => {
    const ids = HANDBOOK_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of HANDBOOK_ENTRIES) {
      expect(e.trains.trim(), e.id).not.toBe("");
      expect(e.benefits.length, e.id).toBeGreaterThan(0);
      expect(e.howToPractice.length, e.id).toBeGreaterThan(0);
      expect(e.tips.length, e.id).toBeGreaterThan(0);
      expect(HANDBOOK_GROUPS.some((g) => g.id === e.group), e.id).toBe(true);
      expect(e.href.startsWith("/"), e.id).toBe(true);
      if (e.group === "exercise") expect(e.levels, `${e.id} needs levels`).toBeDefined();
    }
  });
});
