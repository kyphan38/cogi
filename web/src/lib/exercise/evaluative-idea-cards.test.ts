import { describe, expect, it } from "vitest";
import { EVALUATIVE_IDEA_GUIDE, EVALUATIVE_IDEAS } from "./evaluative-idea-guide";
import { pickEvaluativeCards } from "./evaluative-idea-cards";
import type { EvaluativeExerciseRow } from "@/lib/types/exercise";
import type { EvaluativeResult } from "./evaluative-score";

const scoringRow = (dealbreaker = false, geo = false) =>
  ({
    variant: "scoring",
    criteria: [{ id: "c1", label: "Cost", description: "", suggestedWeight: 3, isDealbreaker: dealbreaker }],
    ...(geo ? { stakeholderNote: "Country X decides; Y and Z are affected." } : {}),
  }) as unknown as EvaluativeExerciseRow;
const scoringResult = (topMatch: boolean, gap = 0): EvaluativeResult => ({
  variant: "scoring",
  criteria: [{ criterionId: "c1", userWeight: 3 + gap, modelWeight: 3, gap }],
  bigCells: [],
  userOrder: [],
  modelOrder: [],
  topMatch,
});

describe("evaluative idea guide", () => {
  it("covers every idea, with every field filled", () => {
    for (const k of EVALUATIVE_IDEAS) {
      const g = EVALUATIVE_IDEA_GUIDE[k];
      for (const v of [g.spot, g.ask, g.fix, g.othersTip, g.practice]) expect(v.trim().length, k).toBeGreaterThan(10);
      expect(g.signals.length, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pickEvaluativeCards", () => {
  it("matrix: the two criteria, then weighing", () => {
    const r: EvaluativeResult = { variant: "matrix", placements: [], correct: 2, total: 4, oneAxis: 1 };
    expect(pickEvaluativeCards({ variant: "matrix" } as EvaluativeExerciseRow, r)).toEqual(["two_criteria", "weighing"]);
  });

  it("scoring: a different best option on a dealbreaker task comes first, then big weight gaps", () => {
    expect(pickEvaluativeCards(scoringRow(true), scoringResult(false, 2))).toEqual(["dealbreakers", "weighing"]);
    expect(pickEvaluativeCards(scoringRow(), scoringResult(true))).toEqual(["hidden_criteria", "weighing"]);
    expect(pickEvaluativeCards(scoringRow(false, true), scoringResult(true))).toEqual(["stakeholders", "hidden_criteria"]);
  });

  it("uncertainty: expected value, and hidden criteria when the best option differs", () => {
    const r = (topMatch: boolean): EvaluativeResult => ({ variant: "uncertainty", options: [], userOrder: [], modelOrder: [], topMatch });
    expect(pickEvaluativeCards({ variant: "uncertainty" } as EvaluativeExerciseRow, r(true))).toEqual(["expected_value"]);
    expect(pickEvaluativeCards({ variant: "uncertainty" } as EvaluativeExerciseRow, r(false))).toEqual(["expected_value", "hidden_criteria"]);
  });
});
