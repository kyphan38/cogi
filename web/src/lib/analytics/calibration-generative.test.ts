import { describe, expect, it } from "vitest";
import { generativeRubricToAccuracy } from "./calibration-generative";

describe("generativeRubricToAccuracy", () => {
  it("clamps to 0 for negative scores", () => {
    expect(generativeRubricToAccuracy(-10)).toBe(0);
  });

  it("clamps to 100 for scores above 100", () => {
    expect(generativeRubricToAccuracy(150)).toBe(100);
  });

  it("rounds fractional scores", () => {
    expect(generativeRubricToAccuracy(72.6)).toBe(73);
    expect(generativeRubricToAccuracy(72.4)).toBe(72);
  });

  it("returns 0 for NaN", () => {
    expect(generativeRubricToAccuracy(NaN)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(generativeRubricToAccuracy(Infinity)).toBe(0);
  });

  it("passes through valid scores unchanged", () => {
    expect(generativeRubricToAccuracy(0)).toBe(0);
    expect(generativeRubricToAccuracy(50)).toBe(50);
    expect(generativeRubricToAccuracy(100)).toBe(100);
  });
});
