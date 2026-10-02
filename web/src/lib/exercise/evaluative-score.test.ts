import { describe, expect, it } from "vitest";
import type { EvaluativeMatrixRow, EvaluativeScoringRow, EvaluativeUncertaintyRow } from "@/lib/types/exercise";
import { evaluativeCoachingRefs, rateEvaluative, scoreEvaluative } from "./evaluative-score";

const base = { id: "x", type: "evaluative" as const, domain: "d", title: "t", scenario: "s", confidenceBefore: 50, aiPerspective: null, createdAt: "", completedAt: null };

const matrix: EvaluativeMatrixRow = {
  ...base,
  variant: "matrix",
  axisX: { label: "Cost", lowLabel: "low", highLabel: "high" },
  axisY: { label: "Value", lowLabel: "low", highLabel: "high" },
  options: [
    { id: "o1", title: "A", description: "", intendedQuadrant: "top-right", explanation: "e" },
    { id: "o2", title: "B", description: "", intendedQuadrant: "bottom-left", explanation: "e" },
    { id: "o3", title: "C", description: "", intendedQuadrant: "top-left", explanation: "e" },
    { id: "o4", title: "D", description: "", intendedQuadrant: "bottom-right", explanation: "e" },
  ],
  placements: { o1: "top-right", o2: "bottom-left", o3: "top-left", o4: "top-left" },
};

const scoring: EvaluativeScoringRow = {
  ...base,
  variant: "scoring",
  criteria: [
    { id: "c1", label: "Cost", description: "", suggestedWeight: 2 },
    { id: "c2", label: "Speed", description: "", suggestedWeight: 4 },
    { id: "c3", label: "Safety", description: "", suggestedWeight: 3, isDealbreaker: true },
  ],
  options: [
    { id: "a", title: "A", description: "", suggestedScores: { c1: 2, c2: 5, c3: 4 }, explanation: "" },
    { id: "b", title: "B", description: "", suggestedScores: { c1: 5, c2: 2, c3: 4 }, explanation: "" },
  ],
  hiddenCriteria: [],
  criterionWeights: { c1: 5, c2: 4, c3: 3 },
  scores: { a: { c1: 2, c2: 5, c3: 2 }, b: { c1: 5, c2: 2, c3: 4 } },
};

const uncertainty: EvaluativeUncertaintyRow = {
  ...base,
  variant: "uncertainty",
  options: [
    { id: "u1", title: "Safe", description: "", outcomes: [{ id: "x", label: "ok", probability: 1, payoff: 50, explanation: "" }] },
    {
      id: "u2",
      title: "Risky",
      description: "",
      outcomes: [
        { id: "w", label: "win", probability: 0.3, payoff: 200, explanation: "" },
        { id: "l", label: "lose", probability: 0.7, payoff: -20, explanation: "" },
      ],
    },
  ],
  userProbabilities: { u1: { x: 1 }, u2: { w: 0.8, l: 0.2 } },
  userPayoffs: { u1: { x: 50 }, u2: { w: 200, l: -20 } },
};

describe("scoreEvaluative - matrix", () => {
  it("counts options placed in the model's quadrant", () => {
    const r = scoreEvaluative(matrix);
    expect(r).toMatchObject({ variant: "matrix", correct: 3, total: 4 });
    expect(rateEvaluative(r)).toBe("good");
    expect(evaluativeCoachingRefs(r).required).toEqual(["option_o4"]);
  });
});

describe("scoreEvaluative - scoring", () => {
  it("finds weight and score gaps and rules out options failing a dealbreaker", () => {
    const r = scoreEvaluative(scoring);
    if (r.variant !== "scoring") throw new Error("variant");
    expect(r.criteria.find((c) => c.criterionId === "c1")).toMatchObject({ userWeight: 5, modelWeight: 2, gap: 3 });
    expect(r.bigCells).toEqual([{ optionId: "a", criterionId: "c3", user: 2, model: 4 }]);
    // The user's Safety score of 2 rules A out, so only B is ranked; the model ranks A first.
    expect(r.userOrder).toEqual(["b"]);
    expect(r.modelOrder).toEqual(["a", "b"]);
    expect(r.topMatch).toBe(false);
    expect(rateEvaluative(r)).toBe("ok");
    expect(evaluativeCoachingRefs(r).required).toEqual(["criterion_c1", "criterion_c3"]);
  });
});

describe("scoreEvaluative - uncertainty", () => {
  it("compares expected values and the best option", () => {
    const r = scoreEvaluative(uncertainty);
    if (r.variant !== "uncertainty") throw new Error("variant");
    expect(r.options).toEqual([
      { optionId: "u1", userEv: 50, modelEv: 50 },
      { optionId: "u2", userEv: 156, modelEv: 46 },
    ]);
    expect(r.topMatch).toBe(false);
    expect(evaluativeCoachingRefs(r).required).toEqual(["option_u1", "option_u2"]);
  });

  it("gives no EV when probabilities do not add up to 1", () => {
    const r = scoreEvaluative({ ...uncertainty, userProbabilities: { u1: { x: 1 }, u2: { w: 0.5, l: 0.2 } } });
    if (r.variant !== "uncertainty") throw new Error("variant");
    expect(r.options[1]!.userEv).toBeNull();
    expect(r.userOrder).toEqual(["u1"]);
  });
});

describe("rateEvaluative", () => {
  it("never rates judgment variants as poor", () => {
    expect(rateEvaluative({ variant: "scoring", criteria: [], bigCells: [], userOrder: [], modelOrder: ["a"], topMatch: false })).toBe("ok");
    expect(rateEvaluative({ ...scoreEvaluative(matrix), correct: 1 } as never)).toBe("poor");
  });
});
