import { describe, expect, it } from "vitest";
import { JUDGMENT_LENS_GUIDE } from "./judgment-lens-guide";
import { pickLensCards } from "./judgment-lens-cards";
import type { JudgmentResult } from "./judgment-score";

const responses = [
  { id: "r1", expertRank: 1, lens: "people" as const },
  { id: "r2", expertRank: 2, lens: "steady" as const },
  { id: "r3", expertRank: 3, lens: "think" as const },
];
const lenses = (wrong: string[] = []): JudgmentResult["lenses"] =>
  (["think", "people", "steady"] as const).map((lens) => ({ lens, correct: !wrong.includes(lens) }));
const ranks = (user: number[]) => responses.map((r, i) => ({ id: r.id, userRank: user[i]!, expertRank: r.expertRank }));

describe("judgment lens guide", () => {
  it("covers the three lenses, with every field filled", () => {
    for (const [k, g] of Object.entries(JUDGMENT_LENS_GUIDE)) {
      for (const v of [g.spot, g.ask, g.fix, g.othersTip, g.practice]) expect(v.trim().length, k).toBeGreaterThan(10);
      expect(g.signals.length, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pickLensCards", () => {
  it("all the same as the expert: the best response's lens, then the usual order", () => {
    expect(pickLensCards(responses, { responses: ranks([1, 2, 3]), lenses: lenses() })).toEqual(["people", "think"]);
  });

  it("puts a lens read differently first, then the lens of the furthest rank", () => {
    expect(pickLensCards(responses, { responses: ranks([3, 2, 1]), lenses: lenses(["steady"]) })).toEqual(["steady", "people"]);
    expect(pickLensCards(responses, { responses: ranks([2, 1, 3]), lenses: lenses() })).toEqual(["people", "steady"]);
  });

  it("works for rows saved before responses had a lens", () => {
    const old = responses.map((r) => ({ id: r.id, expertRank: r.expertRank }));
    expect(pickLensCards(old, { responses: ranks([1, 2, 3]), lenses: lenses() })).toEqual(["think", "people"]);
  });
});
