import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/types/exercise";
import { monthLabel, monthOf, monthStats, monthToReview, previousMonth } from "./stats";

let n = 0;
/** A calibration row with `right` of 4 answers right. */
function cal(day: string, right: number, extra: object = {}): Exercise {
  return {
    id: `c${++n}`,
    type: "calibration",
    domain: "Mixed",
    title: "t",
    createdAt: `${day}T08:00:00`,
    completedAt: `${day}T09:00:00`,
    result: { items: [0, 1, 2, 3].map((i) => ({ id: `q${i}`, kind: "baserate", answered: true, correct: i < right })) },
    ...extra,
  } as unknown as Exercise;
}

describe("months", () => {
  it("steps back over a year end and names a month", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(previousMonth("2026-11")).toBe("2026-10");
    expect(monthLabel("2026-10")).toBe("October 2026");
    expect(monthOf("2026-10-31T09:00:00")).toBe("2026-10");
  });
});

describe("monthStats", () => {
  it("counts the month, compares with the month before, and collects notes", () => {
    const rows = [
      cal("2026-10-03", 4, { takeaway: " Check the base rate first. ", useCheck: { result: "partly", note: "", at: "x" } }),
      cal("2026-10-03", 3),
      cal("2026-10-20", 2),
      cal("2026-09-10", 2),
      cal("2026-09-11", 2),
      { id: "g", type: "geo", completedAt: "2026-10-05T09:00:00", createdAt: "2026-10-05T08:00:00" } as unknown as Exercise,
    ];
    const s = monthStats(rows, "2026-10");
    expect(s).toMatchObject({ month: "2026-10", total: 4, prevTotal: 2, activeDays: 3, takeaways: ["Check the base rate first."], used: { yes: 0, partly: 1, no: 0 } });
    expect(s.types[0]).toEqual({ type: "calibration", label: "Calibration", count: 3, score: 75, prevCount: 2, prevScore: 50, trend: "up" });
    // Geo Lab has no score to compare.
    expect(s.types[1]).toMatchObject({ type: "geo", count: 1, score: null, trend: null });
  });

  it("calls a small change steady and a first month new", () => {
    expect(monthStats([cal("2026-10-03", 2), cal("2026-09-03", 2)], "2026-10").types[0]!.trend).toBe("flat");
    expect(monthStats([cal("2026-10-03", 1), cal("2026-09-03", 3)], "2026-10").types[0]!.trend).toBe("down");
    expect(monthStats([cal("2026-10-03", 2)], "2026-10").types[0]!.trend).toBe("new");
  });
});

describe("monthToReview", () => {
  const october = [cal("2026-10-01", 1), cal("2026-10-02", 1), cal("2026-10-03", 1)];
  it("offers the last full month once it has enough exercises and no review", () => {
    expect(monthToReview(october, [], "2026-11-16")).toBe("2026-10");
    expect(monthToReview(october.slice(0, 2), [], "2026-11-16")).toBeNull();
    expect(monthToReview(october, [{ month: "2026-10" }], "2026-11-16")).toBeNull();
    expect(monthToReview(october, [], "2026-12-01")).toBeNull();
  });
});
