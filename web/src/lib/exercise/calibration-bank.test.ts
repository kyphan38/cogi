import { describe, expect, it } from "vitest";
import { CALIBRATION_BANK, CALIBRATION_CATEGORIES } from "./calibration-bank";
import { CALIBRATION_LEVELS } from "./calibration-levels";

describe("Calibration bank", () => {
  it("has unique ids, a source and an explanation for every item", () => {
    const ids = CALIBRATION_BANK.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const x of CALIBRATION_BANK) {
      expect(x.source.trim(), x.id).not.toBe("");
      expect(x.explanation.trim(), x.id).not.toBe("");
      expect(x.question.trim().endsWith("?"), x.id).toBe(true);
    }
  });

  it("uses positive, finite answers for ranges and two different options for two-answer items", () => {
    for (const x of CALIBRATION_BANK) {
      if (x.kind === "interval") {
        expect(Number.isFinite(x.answer) && x.answer > 0, x.id).toBe(true);
        expect(x.unit.trim(), x.id).not.toBe("");
      } else {
        expect(x.options[0], x.id).not.toBe(x.options[1]);
      }
    }
  });

  it("has enough questions in every category for every level", () => {
    const most = (k: "binaryCount" | "intervalCount") => Math.max(...Object.values(CALIBRATION_LEVELS).map((l) => l[k]));
    for (const c of CALIBRATION_CATEGORIES) {
      const inCat = CALIBRATION_BANK.filter((x) => x.category === c);
      expect(inCat.filter((x) => x.kind === "binary").length, c).toBeGreaterThanOrEqual(most("binaryCount") + 4);
      expect(inCat.filter((x) => x.kind === "interval").length, c).toBeGreaterThanOrEqual(most("intervalCount") + 2);
    }
  });

  it("does not always put the right answer first", () => {
    const binary = CALIBRATION_BANK.filter((x) => x.kind === "binary");
    const second = binary.filter((x) => x.answerIndex === 1).length;
    expect(second / binary.length).toBeGreaterThan(0.25);
  });
});
