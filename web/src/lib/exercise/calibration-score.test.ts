import { describe, expect, it } from "vitest";
import type { CalibrationItem } from "./calibration-math";
import {
  aggregateCalibration,
  CALIBRATION_SUGGEST_MIN_ANSWERS,
  calibrationCoachingRefs,
  poolCalibration,
  rateCalibration,
  scoreCalibration,
  suggestCalibrationLevel,
  type CalibrationResult,
} from "./calibration-score";

const items: CalibrationItem[] = [
  { id: "b1", kind: "binary", category: "Science", question: "A or B?", options: ["A", "B"], answerIndex: 0, explanation: "A.", source: "S" },
  { id: "b2", kind: "binary", category: "Science", question: "C or D?", options: ["C", "D"], answerIndex: 1, explanation: "D.", source: "S" },
  { id: "n1", kind: "interval", category: "Science", question: "How many?", answer: 206, unit: "bones", explanation: "206.", source: "S" },
  { id: "n2", kind: "interval", category: "Science", question: "How far?", answer: 384400, unit: "km", explanation: "384,400.", source: "S" },
  {
    id: "br-1",
    kind: "baserate",
    story: "1% have it.",
    question: "Chance?",
    baseRate: 1,
    hitRate: 90,
    falseAlarmRate: 10,
    twoStep: false,
    counts: { has: 100, hasNot: 9900, truePositives: 90, falsePositives: 990 },
    labels: { has: "have it", hasNot: "do not", positive: "test positive", unit: "people" },
    answer: 8.3,
    explanation: "90 of 1,080.",
  },
];

describe("scoreCalibration", () => {
  it("scores two-answer items with a Brier score and confidence buckets", () => {
    const r = scoreCalibration({
      items,
      answers: { b1: { choice: 0, confidence: 90 }, b2: { choice: 0, confidence: 90 } },
      intervalTarget: 80,
    });
    expect(r.binary.right).toBe(1);
    // ((0.9 - 1)^2 + (0.9 - 0)^2) / 2 = 0.41
    expect(r.binary.brier).toBe(0.41);
    expect(r.binary.buckets).toEqual([{ confidence: 90, count: 2, right: 1 }]);
  });

  it("scores ranges: hit, which side missed, and very wide; swaps a reversed range", () => {
    const r = scoreCalibration({
      items,
      answers: { n1: { low: 250, high: 150 }, n2: { low: 1000, high: 300000 } },
      intervalTarget: 80,
    });
    const n1 = r.items.find((x) => x.id === "n1")!;
    const n2 = r.items.find((x) => x.id === "n2")!;
    expect(n1).toMatchObject({ correct: true, veryWide: false });
    expect(n2).toMatchObject({ correct: false, missed: "too-low", veryWide: true });
    expect(r.interval).toEqual({ count: 2, hits: 1, target: 80, veryWide: 1 });
  });

  it("counts a base-rate answer within 5 points as right", () => {
    const near = scoreCalibration({ items, answers: { "br-1": { estimate: 12 } }, intervalTarget: 80 });
    const far = scoreCalibration({ items, answers: { "br-1": { estimate: 90 } }, intervalTarget: 80 });
    expect(near.baseRate.right).toBe(1);
    expect(far.items.find((x) => x.id === "br-1")).toMatchObject({ correct: false, error: 81.7 });
  });
});

describe("rateCalibration", () => {
  const all = (answers: Parameters<typeof scoreCalibration>[0]["answers"]) =>
    rateCalibration(scoreCalibration({ items, answers, intervalTarget: 80 }));

  it("is good when sure answers are right, ranges hit and the base rate is right", () => {
    expect(
      all({
        b1: { choice: 0, confidence: 90 },
        b2: { choice: 1, confidence: 80 },
        n1: { low: 150, high: 250 },
        n2: { low: 300000, high: 450000 },
        "br-1": { estimate: 9 },
      }),
    ).toBe("good");
  });

  it("is poor when confident answers are wrong, and ok for very wide ranges that all hit", () => {
    expect(all({ b1: { choice: 1, confidence: 100 }, b2: { choice: 0, confidence: 90 }, "br-1": { estimate: 9 } })).toBe("poor");
    expect(
      all({
        b1: { choice: 0, confidence: 70 },
        b2: { choice: 1, confidence: 70 },
        n1: { low: 1, high: 100000 },
        n2: { low: 1, high: 100000000 },
        "br-1": { estimate: 9 },
      }),
    ).toBe("ok");
  });
});

describe("calibrationCoachingRefs", () => {
  it("requires the pattern, base rates, missed ranges and confident wrong answers", () => {
    const r = scoreCalibration({
      items,
      answers: { b1: { choice: 1, confidence: 60 }, b2: { choice: 0, confidence: 90 }, n1: { low: 150, high: 250 }, n2: { low: 1, high: 2 } },
      intervalTarget: 80,
    });
    expect(calibrationCoachingRefs(r).required).toEqual(["pattern", "item_b2", "item_n2", "item_br-1"]);
  });
});

describe("aggregateCalibration", () => {
  it("adds up confidence steps, ranges per target and base rates across exercises", () => {
    const a = scoreCalibration({ items, answers: { b1: { choice: 0, confidence: 90 }, n1: { low: 150, high: 250 } }, intervalTarget: 80 });
    const b = scoreCalibration({ items, answers: { b2: { choice: 0, confidence: 90 }, n2: { low: 1, high: 2 }, "br-1": { estimate: 9 } }, intervalTarget: 90 });
    const h = aggregateCalibration([a, b]);
    expect(h.exercises).toBe(2);
    expect(h.answered).toBe(5);
    expect(h.buckets).toEqual([{ confidence: 90, count: 2, right: 1 }]);
    expect(h.ranges).toEqual([
      { target: 80, count: 2, hits: 1 },
      { target: 90, count: 2, hits: 0 },
    ]);
    expect(h.baseRate).toEqual({ count: 2, right: 1 });
  });
});

describe("base-rate tolerance and repeats", () => {
  it("scales the base-rate tolerance with how rare it is", () => {
    const at = (estimate: number, answer: number) =>
      scoreCalibration({
        items: [{ ...(items[4] as Extract<CalibrationItem, { kind: "baserate" }>), answer }],
        answers: { "br-1": { estimate } },
        intervalTarget: 80,
      }).baseRate.right;
    // 1.9%: within 1 point only (half of 1.9 is under 1).
    expect(at(2.8, 1.9)).toBe(1);
    expect(at(6, 1.9)).toBe(0);
    // 8.3%: within 4.15 points.
    expect(at(12, 8.3)).toBe(1);
    expect(at(13, 8.3)).toBe(0);
    // 50%: within 5 points, as before.
    expect(at(55, 50)).toBe(1);
  });

  it("leaves questions seen before out of the History summary, but scores them in the exercise", () => {
    const seen = items.map((x) => (x.id === "b1" || x.id === "n1" ? { ...x, seenBefore: true } : x)) as CalibrationItem[];
    const r = scoreCalibration({
      items: seen,
      answers: { b1: { choice: 0, confidence: 90 }, b2: { choice: 1, confidence: 70 }, n1: { low: 100, high: 300 }, n2: { low: 1, high: 2 } },
      intervalTarget: 80,
    });
    expect(r.binary.right).toBe(2);
    expect(r.items.find((o) => o.id === "b1")?.seenBefore).toBe(true);
    const h = aggregateCalibration([r]);
    expect(h.buckets).toEqual([{ confidence: 70, count: 1, right: 1 }]);
    expect(h.ranges).toEqual([{ target: 80, count: 1, hits: 0 }]);
    // b2 and n2; the base-rate item was not answered.
    expect(h.answered).toBe(2);
  });
});

describe("suggestCalibrationLevel (pooled streak)", () => {
  /** `n` binary questions (4 like Standard by default) at `conf`% confidence, `right` of them right. */
  const result = (conf: number, right: number, n = 4, answered = n): CalibrationResult =>
    poolCalibration([
      {
        items: Array.from({ length: n }, (_, i) => ({
          id: `b${conf}-${right}-${i}-${Math.random()}`,
          kind: "binary" as const,
          answered: i < answered,
          correct: i < answered && i < right,
          confidence: i < answered ? conf : undefined,
        })),
        binary: { count: 0, right: 0, brier: null, buckets: [] },
        interval: { count: 0, hits: 0, target: 90, veryWide: 0 },
        baseRate: { count: 0, right: 0 },
      },
    ]);

  it("pooling recomputes Brier over all answers", () => {
    const pooled = poolCalibration([result(90, 4), result(90, 3)]);
    expect(pooled.binary.count).toBe(8);
    expect(pooled.binary.right).toBe(7);
    // 7 x 0.01 + 1 x 0.81, over 8
    expect(pooled.binary.brier).toBeCloseTo(0.11, 3);
    expect(pooled.interval.target).toBe(90);
  });

  it("one shaky exercise in a good streak still moves up when the pool is good", () => {
    // Alone, 90% sure with 4 of 8 right is poor (Brier 0.41).
    const shaky = result(90, 4, 8);
    expect(rateCalibration(shaky)).toBe("poor");
    // Pooled with two perfect ones: Brier (20 x 0.01 + 4 x 0.81) / 24 = 0.143, good.
    const streak = [result(90, 8, 8), shaky, result(90, 8, 8)];
    expect(suggestCalibrationLevel("guided", streak)).toEqual({ direction: "up", to: "standard" });
  });

  it("skipped questions do not count toward the minimum", () => {
    const skipped = [result(90, 4, 8, 4), result(90, 4, 8, 4), result(90, 4, 8, 4)];
    expect(suggestCalibrationLevel("guided", skipped)).toBeNull();
  });

  it("does not suggest a change with too few answers", () => {
    const thin = [result(90, 4), result(90, 4), result(90, 4)];
    expect(thin[0]!.items.length * 3).toBeLessThan(CALIBRATION_SUGGEST_MIN_ANSWERS);
    expect(suggestCalibrationLevel("standard", thin)).toBeNull();
  });

  it("suggests the level below when the pooled streak is poor", () => {
    const big = (conf: number, right: number) => poolCalibration([result(conf, right), result(conf, right)]);
    expect(suggestCalibrationLevel("standard", [big(100, 1), big(100, 1)])).toEqual({ direction: "down", to: "guided" });
    expect(suggestCalibrationLevel("guided", [big(100, 1), big(100, 1)])).toBeNull();
  });

  it("needs the full streak", () => {
    const big = poolCalibration([result(90, 4), result(90, 4), result(90, 4), result(90, 4)]);
    expect(suggestCalibrationLevel("guided", [big, big])).toBeNull();
    expect(suggestCalibrationLevel("guided", [big, big, big])).toEqual({ direction: "up", to: "standard" });
  });
});
