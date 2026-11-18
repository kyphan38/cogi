import { describe, expect, it } from "vitest";
import { rateHumor, scoreHumorChoices, scoreHumorWritten, humorStepCounts } from "./humor-score";
import type { HumorRound } from "@/lib/ai/validators/humor";

const round = (best: number): HumorRound => ({
  moment: "Your friend teases your new haircut.",
  serious: false,
  trap: "Hitting back",
  trapWhy: "A sharp reply turns a tease into a fight.",
  options: [0, 1, 2].map((i) => ({
    text: `answer ${i}`,
    quality: i === best ? "best" : i === (best + 1) % 3 ? "ok" : "poor",
    why: "because",
  })),
});

const allSteps = (v: boolean) => ({ kind: v, fits: v, short: v, twist: v });

describe("scoreHumorChoices", () => {
  it("gives 1 for best, 0.5 for ok, 0 for poor", () => {
    const rounds = [round(0), round(1)];
    expect(scoreHumorChoices(rounds, [0, 1]).score).toBe(1);
    expect(scoreHumorChoices(rounds, [1, 2]).score).toBe(0.5);
    expect(scoreHumorChoices(rounds, [2, 0]).score).toBe(0);
  });

  it("counts a missing pick as 0", () => {
    const r = scoreHumorChoices([round(0), round(0)], [0]);
    expect(r.score).toBe(0.5);
    expect(r.rounds[1]).toMatchObject({ picked: null, quality: null });
  });
});

describe("scoreHumorWritten", () => {
  it("counts the steps used over all rounds", () => {
    const r = scoreHumorWritten(
      {
        rounds: [
          { steps: allSteps(true), strong: "s", missing: "", better: "b" },
          { steps: { kind: true, fits: false, short: true, twist: false }, strong: "", missing: "m", better: "b" },
        ],
        overall: "o",
      },
      2,
    );
    expect(r.score).toBe(0.75);
    expect(humorStepCounts(r)).toEqual({ kind: 2, fits: 1, short: 2, twist: 1 });
    expect(r.overall).toBe("o");
  });

  it("fills a missing round with no steps", () => {
    const r = scoreHumorWritten({ rounds: [{ steps: allSteps(true), strong: "", missing: "", better: "b" }], overall: "o" }, 2);
    expect(r.score).toBe(0.5);
    expect(r.rounds[1]!.steps).toEqual(allSteps(false));
  });
});

describe("rateHumor", () => {
  it("rates by score", () => {
    const at = (score: number) => rateHumor({ mode: "choose", rounds: [], score });
    expect(at(0.75)).toBe("good");
    expect(at(0.5)).toBe("ok");
    expect(at(0.25)).toBe("poor");
  });
});
