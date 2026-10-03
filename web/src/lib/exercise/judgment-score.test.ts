import { describe, expect, it } from "vitest";
import type { JudgmentLensQuestion, JudgmentResponse } from "@/lib/ai/validators/judgment";
import { judgmentCoachingRefs, rateJudgment, scoreJudgment } from "./judgment-score";

const responses: JudgmentResponse[] = [
  { id: "r1", text: "a", expertRank: 2, why: "w" },
  { id: "r2", text: "b", expertRank: 1, why: "w" },
  { id: "r3", text: "c", expertRank: 4, why: "w" },
  { id: "r4", text: "d", expertRank: 3, why: "w" },
];
const lensQuestions: JudgmentLensQuestion[] = (["think", "people", "steady"] as const).map((lens) => ({
  lens, question: "q", options: ["a", "b", "c"], answerIndex: 1, explanation: "e",
}));

function score(userOrder: string[], lensAnswers = { think: 1, people: 0, steady: 1 }, lensFreeText = false) {
  return scoreJudgment({ responses, userOrder, lensQuestions, lensAnswers, lensFreeText });
}

describe("scoreJudgment", () => {
  it("gives full closeness for the expert's order", () => {
    const r = score(["r2", "r1", "r4", "r3"]);
    expect(r).toMatchObject({ closeness: 1, topMatch: true });
    expect(rateJudgment(r)).toBe("good");
  });

  it("gives zero closeness for the reversed order", () => {
    const r = score(["r3", "r4", "r1", "r2"]);
    expect(r).toMatchObject({ closeness: 0, topMatch: false });
    expect(rateJudgment(r)).toBe("ok");
  });

  it("records each response's two ranks", () => {
    const r = score(["r1", "r2", "r4", "r3"]);
    expect(r.responses.find((x) => x.id === "r1")).toEqual({ id: "r1", userRank: 1, expertRank: 2 });
    expect(r.closeness).toBe(0.75);
    expect(r.topMatch).toBe(false);
  });

  it("works for three responses", () => {
    const three = responses.slice(0, 2).concat({ id: "r3", text: "c", expertRank: 3, why: "w" });
    const r = scoreJudgment({ responses: three, userOrder: ["r3", "r1", "r2"], lensQuestions, lensAnswers: {}, lensFreeText: false });
    // Distances 2 + 1 + 1 = 4 over a maximum of 4.
    expect(r.closeness).toBe(0);
  });

  it("checks lens readings, or leaves them open for free text", () => {
    expect(score(["r2"]).lenses.map((l) => l.correct)).toEqual([true, false, true]);
    expect(score(["r2"], {} as never, true).lenses.map((l) => l.correct)).toEqual([null, null, null]);
  });
});

describe("judgmentCoachingRefs", () => {
  it("requires every response, differing or free lenses, and the own response", () => {
    const r = score(["r2", "r1", "r4", "r3"]);
    expect(judgmentCoachingRefs(r, { hasOwnResponse: true }).required).toEqual([
      "response_r1", "response_r2", "response_r3", "response_r4", "lens_people", "own",
    ]);
  });
});
