import { describe, expect, it } from "vitest";
import { CALIBRATION_IDEA_GUIDE, CALIBRATION_IDEAS } from "./calibration-idea-guide";
import { pickCalibrationCards } from "./calibration-idea-cards";
import type { CalibrationResult } from "./calibration-score";

const result = (over: Partial<CalibrationResult> = {}): CalibrationResult => ({
  items: [],
  binary: { count: 0, right: 0, brier: null, buckets: [] },
  interval: { count: 0, hits: 0, target: 80, veryWide: 0 },
  baseRate: { count: 1, right: 1 },
  ...over,
});

describe("calibration idea guide", () => {
  it("covers every idea, with every field filled", () => {
    for (const k of CALIBRATION_IDEAS) {
      const g = CALIBRATION_IDEA_GUIDE[k];
      for (const v of [g.spot, g.ask, g.fix, g.othersTip, g.practice]) expect(v.trim().length, k).toBeGreaterThan(10);
      expect(g.signals.length, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pickCalibrationCards", () => {
  it("well calibrated: keep score, then base rates", () => {
    expect(pickCalibrationCards(result())).toEqual(["keep_score", "base_rates"]);
  });

  it("a confident miss and ranges that miss too often come first", () => {
    const r = result({
      items: [{ id: "b1", kind: "binary", answered: true, correct: false, confidence: 90 }],
      interval: { count: 4, hits: 1, target: 80, veryWide: 0 },
    });
    expect(pickCalibrationCards(r)).toEqual(["overconfidence", "wide_ranges"]);
  });

  it("a wrong base rate, and signs of being too unsure", () => {
    expect(pickCalibrationCards(result({ baseRate: { count: 1, right: 0 } }))[0]).toBe("base_rates");
    const unsure = result({ binary: { count: 4, right: 4, brier: 0.2, buckets: [{ confidence: 50, count: 2, right: 2 }, { confidence: 60, count: 2, right: 2 }] } });
    expect(pickCalibrationCards(unsure)).toEqual(["underconfidence", "keep_score"]);
  });
});
