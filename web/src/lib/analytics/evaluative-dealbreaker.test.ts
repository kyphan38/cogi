import { describe, expect, it } from "vitest";
import { computeDisqualifiedOptions, DEALBREAKER_PASS_THRESHOLD } from "./evaluative-dealbreaker";
import type { EvaluativeScoringRow } from "@/lib/types/exercise";

function makeRow(criteria: EvaluativeScoringRow["criteria"]): EvaluativeScoringRow {
  return {
    id: "ex1",
    type: "evaluative",
    variant: "scoring",
    domain: "test",
    title: "Test",
    scenario: "Test scenario",
    criteria,
    options: [
      { id: "o1", title: "Option A", description: "", suggestedScores: {}, explanation: "" },
      { id: "o2", title: "Option B", description: "", suggestedScores: {}, explanation: "" },
    ],
    hiddenCriteria: [],
    criterionWeights: {},
    scores: {},
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

describe("DEALBREAKER_PASS_THRESHOLD", () => {
  it("is 3", () => {
    expect(DEALBREAKER_PASS_THRESHOLD).toBe(3);
  });
});

describe("computeDisqualifiedOptions", () => {
  it("returns empty array when no criteria are dealbreakers", () => {
    const row = makeRow([{ id: "c1", label: "Cost", description: "", suggestedWeight: 3 }]);
    const scores = { o1: { c1: 1 }, o2: { c1: 1 } };
    expect(computeDisqualifiedOptions(row, scores)).toEqual([]);
  });

  it("returns empty array when all options pass the dealbreaker criterion", () => {
    const row = makeRow([
      { id: "c1", label: "Safety", description: "", isDealbreaker: true, suggestedWeight: 5 },
    ]);
    const scores = { o1: { c1: 3 }, o2: { c1: 5 } };
    expect(computeDisqualifiedOptions(row, scores)).toEqual([]);
  });

  it("flags an option scoring below the pass threshold on a dealbreaker criterion", () => {
    const row = makeRow([
      { id: "c1", label: "Safety", description: "", isDealbreaker: true, suggestedWeight: 5 },
    ]);
    const scores = { o1: { c1: 2 }, o2: { c1: 4 } };
    const result = computeDisqualifiedOptions(row, scores);
    expect(result).toHaveLength(1);
    expect(result[0].optionId).toBe("o1");
    expect(result[0].optionTitle).toBe("Option A");
    expect(result[0].reasons).toEqual([
      { criterionId: "c1", criterionLabel: "Safety", userScore: 2 },
    ]);
  });

  it("treats a score exactly at the threshold as passing", () => {
    const row = makeRow([
      { id: "c1", label: "Safety", description: "", isDealbreaker: true, suggestedWeight: 5 },
    ]);
    const scores = { o1: { c1: DEALBREAKER_PASS_THRESHOLD }, o2: { c1: 5 } };
    expect(computeDisqualifiedOptions(row, scores)).toEqual([]);
  });

  it("defaults a missing user score to 3 (passing)", () => {
    const row = makeRow([
      { id: "c1", label: "Safety", description: "", isDealbreaker: true, suggestedWeight: 5 },
    ]);
    const result = computeDisqualifiedOptions(row, { o1: {}, o2: {} });
    expect(result).toEqual([]);
  });

  it("collects multiple failing dealbreaker reasons for one option", () => {
    const row = makeRow([
      { id: "c1", label: "Safety", description: "", isDealbreaker: true, suggestedWeight: 5 },
      { id: "c2", label: "Legal", description: "", isDealbreaker: true, suggestedWeight: 5 },
      { id: "c3", label: "Cost", description: "", suggestedWeight: 3 },
    ]);
    const scores = { o1: { c1: 1, c2: 2, c3: 5 }, o2: { c1: 4, c2: 4, c3: 1 } };
    const result = computeDisqualifiedOptions(row, scores);
    expect(result).toHaveLength(1);
    expect(result[0].optionId).toBe("o1");
    expect(result[0].reasons).toHaveLength(2);
    expect(result[0].reasons.map((r) => r.criterionId)).toEqual(["c1", "c2"]);
  });

  it("can flag multiple options independently", () => {
    const row = makeRow([
      { id: "c1", label: "Safety", description: "", isDealbreaker: true, suggestedWeight: 5 },
    ]);
    const scores = { o1: { c1: 1 }, o2: { c1: 2 } };
    const result = computeDisqualifiedOptions(row, scores);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.optionId).sort()).toEqual(["o1", "o2"]);
  });
});
