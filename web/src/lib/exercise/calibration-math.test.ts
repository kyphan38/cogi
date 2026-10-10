import { describe, expect, it } from "vitest";
import { buildCalibrationItems, positivePredictiveValue, seededRandom } from "./calibration-math";
import { CALIBRATION_LEVELS } from "./calibration-levels";
import { CALIBRATION_BANK } from "./calibration-bank";

describe("positivePredictiveValue", () => {
  it("matches the textbook case: 1% base rate, 90% hit rate, 9% false alarms is about 9%", () => {
    expect(positivePredictiveValue(1, 90, 9)).toBeCloseTo(9.17, 1);
  });

  it("rises after a second positive test", () => {
    expect(positivePredictiveValue(1, 90, 10, 2)).toBeGreaterThan(positivePredictiveValue(1, 90, 10, 1));
  });
});

describe("base-rate items", () => {
  it("use whole-number counts that add up, and the answer agrees with the counts", () => {
    for (let i = 0; i < 40; i++) {
      const items = buildCalibrationItems({ id: `seed-${i}`, level: "expert", topic: "Mixed" });
      for (const item of items) {
        if (item.kind !== "baserate") continue;
        const c = item.counts;
        for (const v of Object.values(c)) expect(Number.isInteger(v), JSON.stringify(c)).toBe(true);
        expect(c.has + c.hasNot).toBe(10000);
        if (!item.twoStep) {
          expect(item.answer).toBeCloseTo((c.truePositives / (c.truePositives + c.falsePositives)) * 100, 1);
        }
        expect(item.story).toContain(`${item.baseRate}%`);
      }
    }
  });

  it("is the same for the same seed", () => {
    expect(seededRandom("x")()).toBe(seededRandom("x")());
    const a = buildCalibrationItems({ id: "same", level: "standard", topic: "Mixed" });
    const b = buildCalibrationItems({ id: "same", level: "standard", topic: "Mixed" });
    expect(a).toEqual(b);
  });
});

describe("buildCalibrationItems", () => {
  it("gives each level its counts, with only one two-step problem at Expert", () => {
    for (const level of ["guided", "standard", "expert"] as const) {
      const cfg = CALIBRATION_LEVELS[level];
      const items = buildCalibrationItems({ id: `lv-${level}`, level, topic: "Mixed" });
      expect(items.filter((x) => x.kind === "binary")).toHaveLength(cfg.binaryCount);
      expect(items.filter((x) => x.kind === "interval")).toHaveLength(cfg.intervalCount);
      const br = items.filter((x) => x.kind === "baserate");
      expect(br).toHaveLength(cfg.baseRateCount);
      expect(br.filter((x) => x.kind === "baserate" && x.twoStep)).toHaveLength(cfg.twoStepBaseRate ? 1 : 0);
      expect(new Set(items.map((x) => x.id)).size).toBe(items.length);
    }
  });

  it("keeps to the topic and prefers questions not seen before", () => {
    const first = buildCalibrationItems({ id: "a", level: "guided", topic: "Vietnam" });
    const bank = first.filter((x) => x.kind === "binary");
    expect(bank.every((x) => x.kind === "binary" && x.category === "Vietnam")).toBe(true);
    const seen = new Set(bank.map((x) => x.id));
    const next = buildCalibrationItems({ id: "b", level: "guided", topic: "Vietnam", seenIds: seen });
    const fresh = next.filter((x) => x.kind === "binary" && !seen.has(x.id));
    // Vietnam has 13 two-answer questions: 5 unseen are left, then the oldest repeat.
    expect(fresh).toHaveLength(5);
  });
});

describe("buildCalibrationItems - repeats", () => {
  it("when the topic runs out, repeats the questions seen longest ago and marks them", () => {
    const ids = CALIBRATION_BANK.filter((x) => x.kind === "interval" && x.category === "Vietnam").map((x) => x.id);
    // Every Vietnam range has been seen; one of them long ago.
    const seenAt = new Map(ids.map((id, i) => [id, i === 0 ? "2026-01-01" : "2026-10-01"]));
    const again = buildCalibrationItems({ id: "y", level: "expert", topic: "Vietnam", seenAt }).filter((i) => i.kind === "interval");
    expect(again[0]!.id).toBe(ids[0]);
    expect(again.every((i) => i.kind === "interval" && i.seenBefore)).toBe(true);
    const fresh = buildCalibrationItems({ id: "z", level: "expert", topic: "Vietnam" });
    expect(fresh.some((i) => i.kind !== "baserate" && i.seenBefore)).toBe(false);
  });
});
