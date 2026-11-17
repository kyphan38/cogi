import { describe, expect, it } from "vitest";
import { rateTricky, scoreTrickyChoices, scoreTrickyWritten, trickyStepCounts } from "./tricky-score";
import type { TrickyRound } from "@/lib/ai/validators/tricky";

const round = (best: number): TrickyRound => ({
  question: "A or B?",
  trap: "Forced choice",
  trapWhy: "Any name hurts someone.",
  options: [0, 1, 2].map((i) => ({
    text: `answer ${i}`,
    quality: i === best ? "best" : i === (best + 1) % 3 ? "ok" : "poor",
    why: "because",
  })),
});

const allSteps = (v: boolean) => ({ criteria: v, view: v, fair: v, handBack: v });

describe("scoreTrickyChoices", () => {
  it("gives 1 for best, 0.5 for ok, 0 for poor", () => {
    const rounds = [round(0), round(1)];
    expect(scoreTrickyChoices(rounds, [0, 1]).score).toBe(1);
    expect(scoreTrickyChoices(rounds, [1, 2]).score).toBe(0.5);
    expect(scoreTrickyChoices(rounds, [2, 0]).score).toBe(0);
  });

  it("counts a missing pick as 0", () => {
    const r = scoreTrickyChoices([round(0), round(0)], [0]);
    expect(r.score).toBe(0.5);
    expect(r.rounds[1]).toMatchObject({ picked: null, quality: null });
  });
});

describe("scoreTrickyWritten", () => {
  it("counts the steps used over all rounds", () => {
    const r = scoreTrickyWritten(
      {
        rounds: [
          { steps: allSteps(true), strong: "s", missing: "", better: "b" },
          { steps: { criteria: true, view: false, fair: true, handBack: false }, strong: "", missing: "m", better: "b" },
        ],
        overall: "o",
      },
      2,
    );
    expect(r.score).toBe(0.75);
    expect(trickyStepCounts(r)).toEqual({ criteria: 2, view: 1, fair: 2, handBack: 1 });
    expect(r.overall).toBe("o");
  });

  it("fills a missing round with no steps", () => {
    const r = scoreTrickyWritten({ rounds: [{ steps: allSteps(true), strong: "", missing: "", better: "b" }], overall: "o" }, 2);
    expect(r.score).toBe(0.5);
    expect(r.rounds[1]!.steps).toEqual(allSteps(false));
  });
});

describe("rateTricky", () => {
  it("rates by score", () => {
    const at = (score: number) => rateTricky({ mode: "choose", rounds: [], score });
    expect(at(0.75)).toBe("good");
    expect(at(0.5)).toBe("ok");
    expect(at(0.25)).toBe("poor");
  });
});
