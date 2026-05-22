import { describe, expect, it } from "vitest";
import {
  aggregateCompletedByType,
  aggregateCompletedByDomain,
  calibrationGapSeries,
  totalCompleted,
} from "./dashboard-aggregates";
import type { Exercise, ConfidenceRecord } from "@/lib/types/exercise";

function fakeExercise(type: string, domain: string): Exercise {
  return {
    id: `ex-${Math.random()}`,
    type,
    domain,
    title: "Test",
    createdAt: "2025-01-01",
    completedAt: "2025-01-01",
    confidenceBefore: null,
    aiPerspective: null,
  } as unknown as Exercise;
}

describe("aggregateCompletedByType", () => {
  it("returns empty object for no exercises", () => {
    expect(aggregateCompletedByType([])).toEqual({});
  });

  it("counts exercises by type", () => {
    const exercises = [
      fakeExercise("analytical", "tech"),
      fakeExercise("analytical", "tech"),
      fakeExercise("sequential", "science"),
    ];
    expect(aggregateCompletedByType(exercises)).toEqual({
      analytical: 2,
      sequential: 1,
    });
  });
});

describe("aggregateCompletedByDomain", () => {
  it("returns empty array for no exercises", () => {
    expect(aggregateCompletedByDomain([])).toEqual([]);
  });

  it("counts and sorts by domain descending", () => {
    const exercises = [
      fakeExercise("analytical", "Tech"),
      fakeExercise("analytical", "Tech"),
      fakeExercise("sequential", "Science"),
    ];
    const result = aggregateCompletedByDomain(exercises);
    expect(result[0]).toEqual({ domain: "Tech", count: 2 });
    expect(result[1]).toEqual({ domain: "Science", count: 1 });
  });

  it("trims whitespace when grouping domains", () => {
    const exercises = [
      fakeExercise("analytical", "  Tech "),
      fakeExercise("analytical", "Tech"),
    ];
    const result = aggregateCompletedByDomain(exercises);
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(2);
  });

  it("uses 'Unknown' for empty domain", () => {
    const exercises = [fakeExercise("analytical", ""), fakeExercise("analytical", "  ")];
    const result = aggregateCompletedByDomain(exercises);
    expect(result.some((r) => r.domain === "Unknown")).toBe(true);
  });

  it("collapses beyond top 8 into 'Other'", () => {
    const exercises = Array.from({ length: 10 }, (_, i) =>
      fakeExercise("analytical", `Domain${i}`),
    );
    const result = aggregateCompletedByDomain(exercises);
    expect(result.length).toBe(9); // 8 top + Other
    expect(result[result.length - 1]!.domain).toBe("Other");
    expect(result[result.length - 1]!.count).toBe(2);
  });
});

describe("calibrationGapSeries", () => {
  it("returns empty array for no records", () => {
    expect(calibrationGapSeries([])).toEqual([]);
  });

  it("returns sorted series by createdAt", () => {
    const records: ConfidenceRecord[] = [
      { id: "c2", exerciseId: "e2", confidenceBefore: 80, actualAccuracy: 60, gap: 20, createdAt: "2025-01-02" },
      { id: "c1", exerciseId: "e1", confidenceBefore: 70, actualAccuracy: 50, gap: 20, createdAt: "2025-01-01" },
    ];
    const result = calibrationGapSeries(records);
    expect(result[0]!.t).toBe("2025-01-01");
    expect(result[1]!.t).toBe("2025-01-02");
    expect(result[0]!.gap).toBe(20);
  });
});

describe("totalCompleted", () => {
  it("returns count of exercises", () => {
    expect(totalCompleted([])).toBe(0);
    expect(totalCompleted([fakeExercise("a", "b"), fakeExercise("c", "d")])).toBe(2);
  });
});
