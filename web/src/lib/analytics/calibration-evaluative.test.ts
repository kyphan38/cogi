import { describe, expect, it } from "vitest";
import {
  computeEvaluativeMatrixAccuracy,
  computeEvaluativeScoringAccuracy,
  computeEvaluativeUncertaintyAccuracy,
  computeEvaluativeAccuracy,
  computeOptionEv,
  isQuadrant,
} from "./calibration-evaluative";
import type {
  EvaluativeMatrixRow,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
} from "@/lib/types/exercise";

function makeMatrixRow(placements: Record<string, string>): EvaluativeMatrixRow {
  return {
    id: "ex1",
    type: "evaluative",
    variant: "matrix",
    domain: "test",
    title: "Test",
    scenario: "Test scenario",
    axisX: { label: "X", lowLabel: "Low", highLabel: "High" },
    axisY: { label: "Y", lowLabel: "Low", highLabel: "High" },
    options: [
      { id: "o1", title: "Opt 1", description: "", intendedQuadrant: "top-left", explanation: "" },
      { id: "o2", title: "Opt 2", description: "", intendedQuadrant: "top-right", explanation: "" },
      { id: "o3", title: "Opt 3", description: "", intendedQuadrant: "bottom-left", explanation: "" },
      { id: "o4", title: "Opt 4", description: "", intendedQuadrant: "bottom-right", explanation: "" },
    ],
    placements,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

function makeScoringRow(scores: Record<string, Record<string, number>>): EvaluativeScoringRow {
  return {
    id: "ex1",
    type: "evaluative",
    variant: "scoring",
    domain: "test",
    title: "Test",
    scenario: "Test scenario",
    criteria: [
      { id: "c1", label: "Cost", description: "", suggestedWeight: 1 },
      { id: "c2", label: "Risk", description: "", suggestedWeight: 1 },
    ],
    options: [
      { id: "o1", title: "Opt 1", description: "", suggestedScores: { c1: 3, c2: 1 }, explanation: "" },
      { id: "o2", title: "Opt 2", description: "", suggestedScores: { c1: 1, c2: 3 }, explanation: "" },
    ],
    hiddenCriteria: [],
    criterionWeights: { c1: 1, c2: 1 },
    scores,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

function makeUncertaintyRow(
  userProbabilities: Record<string, Record<string, number>>,
): EvaluativeUncertaintyRow {
  return {
    id: "ex1",
    type: "evaluative",
    variant: "uncertainty",
    domain: "test",
    title: "Test",
    scenario: "Test scenario",
    options: [
      {
        id: "o1",
        title: "Opt 1",
        description: "",
        outcomes: [
          { id: "out1", label: "Success", probability: 0.6, payoff: 1000, explanation: "" },
          { id: "out2", label: "Failure", probability: 0.4, payoff: -200, explanation: "" },
        ],
      },
      {
        id: "o2",
        title: "Opt 2",
        description: "",
        outcomes: [
          { id: "out1", label: "Success", probability: 0.3, payoff: 5000, explanation: "" },
          { id: "out2", label: "Failure", probability: 0.7, payoff: -500, explanation: "" },
        ],
      },
    ],
    userProbabilities,
    userPayoffs: {},
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: "2025-01-01",
    completedAt: null,
  };
}

describe("computeEvaluativeMatrixAccuracy", () => {
  it("returns 0 with no options", () => {
    const row = makeMatrixRow({});
    row.options = [];
    expect(computeEvaluativeMatrixAccuracy(row)).toBe(0);
  });

  it("returns 100 for all correct placements", () => {
    const row = makeMatrixRow({
      o1: "top-left",
      o2: "top-right",
      o3: "bottom-left",
      o4: "bottom-right",
    });
    expect(computeEvaluativeMatrixAccuracy(row)).toBe(100);
  });

  it("returns 50 for half correct placements", () => {
    const row = makeMatrixRow({
      o1: "top-left",
      o2: "top-right",
      o3: "top-right",
      o4: "top-left",
    });
    expect(computeEvaluativeMatrixAccuracy(row)).toBe(50);
  });

  it("returns 0 for all wrong placements", () => {
    const row = makeMatrixRow({
      o1: "bottom-right",
      o2: "bottom-left",
      o3: "top-right",
      o4: "top-left",
    });
    expect(computeEvaluativeMatrixAccuracy(row)).toBe(0);
  });

  it("treats missing placements as wrong", () => {
    const row = makeMatrixRow({ o1: "top-left" });
    expect(computeEvaluativeMatrixAccuracy(row)).toBe(25);
  });
});

describe("computeEvaluativeScoringAccuracy", () => {
  it("returns 0 with no scores", () => {
    expect(computeEvaluativeScoringAccuracy(makeScoringRow({}))).toBe(0);
  });

  it("returns 100 for perfect score match", () => {
    const row = makeScoringRow({
      o1: { c1: 3, c2: 1 },
      o2: { c1: 1, c2: 3 },
    });
    expect(computeEvaluativeScoringAccuracy(row)).toBe(100);
  });

  it("returns partial accuracy for offset scores", () => {
    const row = makeScoringRow({
      o1: { c1: 2, c2: 2 },
      o2: { c1: 2, c2: 2 },
    });
    const score = computeEvaluativeScoringAccuracy(row);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("returns 0 for max deviation (4 points off on 0-4 scale)", () => {
    const row = makeScoringRow({
      o1: { c1: 3 + 4, c2: 1 + 4 },
      o2: { c1: 1 + 4, c2: 3 + 4 },
    });
    expect(computeEvaluativeScoringAccuracy(row)).toBe(0);
  });

  it("skips non-finite values", () => {
    const row = makeScoringRow({
      o1: { c1: NaN, c2: 1 },
      o2: { c1: 1, c2: 3 },
    });
    const score = computeEvaluativeScoringAccuracy(row);
    expect(score).toBeGreaterThan(0);
  });
});

describe("computeEvaluativeAccuracy", () => {
  it("delegates to matrix for matrix variant", () => {
    const row = makeMatrixRow({ o1: "top-left", o2: "top-right", o3: "bottom-left", o4: "bottom-right" });
    expect(computeEvaluativeAccuracy(row)).toBe(100);
  });

  it("delegates to scoring for scoring variant", () => {
    const row = makeScoringRow({ o1: { c1: 3, c2: 1 }, o2: { c1: 1, c2: 3 } });
    expect(computeEvaluativeAccuracy(row)).toBe(100);
  });

  it("delegates to uncertainty for uncertainty variant", () => {
    const row = makeUncertaintyRow({ o1: { out1: 0.6, out2: 0.4 }, o2: { out1: 0.3, out2: 0.7 } });
    expect(computeEvaluativeAccuracy(row)).toBe(100);
  });
});

describe("computeOptionEv", () => {
  it("returns null for empty outcomes", () => {
    expect(computeOptionEv([])).toBeNull();
  });

  it("computes probability-weighted expected value", () => {
    const ev = computeOptionEv([
      { probability: 0.6, payoff: 1000 },
      { probability: 0.4, payoff: -200 },
    ]);
    expect(ev).toBe(520);
  });

  it("returns null when probabilities don't sum to ~1", () => {
    const ev = computeOptionEv([
      { probability: 0.5, payoff: 1000 },
      { probability: 0.3, payoff: -200 },
    ]);
    expect(ev).toBeNull();
  });

  it("tolerates probabilities within epsilon of 1", () => {
    const ev = computeOptionEv([
      { probability: 0.61, payoff: 1000 },
      { probability: 0.4, payoff: -200 },
    ]);
    expect(ev).not.toBeNull();
  });

  it("returns null when a probability is out of 0-1 range", () => {
    const ev = computeOptionEv([
      { probability: 1.5, payoff: 1000 },
      { probability: -0.5, payoff: -200 },
    ]);
    expect(ev).toBeNull();
  });

  it("handles a single certain outcome", () => {
    expect(computeOptionEv([{ probability: 1, payoff: 42 }])).toBe(42);
  });
});

describe("computeEvaluativeUncertaintyAccuracy", () => {
  it("returns 0 with no user probability estimates", () => {
    const row = makeUncertaintyRow({});
    expect(computeEvaluativeUncertaintyAccuracy(row)).toBe(0);
  });

  it("returns 100 when user probabilities exactly match AI ground truth", () => {
    const row = makeUncertaintyRow({
      o1: { out1: 0.6, out2: 0.4 },
      o2: { out1: 0.3, out2: 0.7 },
    });
    expect(computeEvaluativeUncertaintyAccuracy(row)).toBe(100);
  });

  it("returns partial accuracy for offset estimates", () => {
    const row = makeUncertaintyRow({
      o1: { out1: 0.4, out2: 0.2 },
      o2: { out1: 0.1, out2: 0.5 },
    });
    const score = computeEvaluativeUncertaintyAccuracy(row);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("returns low accuracy for maximally wrong estimates", () => {
    const row = makeUncertaintyRow({
      o1: { out1: 0, out2: 1 },
      o2: { out1: 1, out2: 0 },
    });
    // mean abs error = (0.6+0.6+0.7+0.7)/4 = 0.65 -> 100*(1-0.65) = 35
    expect(computeEvaluativeUncertaintyAccuracy(row)).toBe(35);
  });

  it("only counts cells the user actually estimated", () => {
    const row = makeUncertaintyRow({ o1: { out1: 0.6 } });
    expect(computeEvaluativeUncertaintyAccuracy(row)).toBe(100);
  });
});

describe("isQuadrant", () => {
  it("returns true for valid quadrants", () => {
    expect(isQuadrant("top-left")).toBe(true);
    expect(isQuadrant("top-right")).toBe(true);
    expect(isQuadrant("bottom-left")).toBe(true);
    expect(isQuadrant("bottom-right")).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isQuadrant("center")).toBe(false);
    expect(isQuadrant(undefined)).toBe(false);
    expect(isQuadrant("")).toBe(false);
  });
});
