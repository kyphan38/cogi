import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/exercises", () => ({
  listCompletedExercises: vi.fn(),
  getConfidenceRecordForExercise: vi.fn(),
}));

import {
  getPerformanceSnapshotForThinkingType,
  ROLLING_WINDOW,
  MIN_SAMPLES_FOR_TIER,
} from "./performance-profile";
import { listCompletedExercises, getConfidenceRecordForExercise } from "@/lib/db/exercises";

const mockListCompleted = vi.mocked(listCompletedExercises);
const mockGetConfidence = vi.mocked(getConfidenceRecordForExercise);

function makeExercise(id: string) {
  return { id, type: "analytical", domain: "test", title: "T", completedAt: "2025-01-01" };
}

function makeConfidence(exerciseId: string, accuracy: number) {
  return {
    id: `c_${exerciseId}`, exerciseId, confidenceBefore: 70,
    actualAccuracy: accuracy, gap: 5, createdAt: "2025-01-01",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("getPerformanceSnapshotForThinkingType", () => {
  it("returns null mean and tier for no exercises", async () => {
    mockListCompleted.mockResolvedValue([]);
    const snap = await getPerformanceSnapshotForThinkingType("analytical");
    expect(snap).toEqual({ rollingMean: null, sampleCount: 0, tier: null });
  });

  it("calculates rolling mean from confidence records", async () => {
    const exercises = [makeExercise("1"), makeExercise("2"), makeExercise("3")];
    mockListCompleted.mockResolvedValue(exercises as never);
    mockGetConfidence.mockImplementation(async (id) => {
      const map: Record<string, number> = { "1": 60, "2": 80, "3": 70 };
      return map[id] ? makeConfidence(id, map[id]) : undefined;
    });
    const snap = await getPerformanceSnapshotForThinkingType("analytical");
    expect(snap.rollingMean).toBe(70);
    expect(snap.sampleCount).toBe(3);
  });

  it("returns tier when sample count >= MIN_SAMPLES_FOR_TIER", async () => {
    const exercises = Array.from({ length: MIN_SAMPLES_FOR_TIER }, (_, i) => makeExercise(`${i}`));
    mockListCompleted.mockResolvedValue(exercises as never);
    mockGetConfidence.mockImplementation(async (id) => makeConfidence(id, 85));
    const snap = await getPerformanceSnapshotForThinkingType("analytical");
    expect(snap.tier).toBe("Expert");
  });

  it("returns null tier when sample count < MIN_SAMPLES_FOR_TIER", async () => {
    const exercises = [makeExercise("1"), makeExercise("2")];
    mockListCompleted.mockResolvedValue(exercises as never);
    mockGetConfidence.mockImplementation(async (id) => makeConfidence(id, 85));
    const snap = await getPerformanceSnapshotForThinkingType("analytical");
    expect(snap.tier).toBeNull();
    expect(snap.rollingMean).toBe(85);
  });

  it("skips exercises without confidence records", async () => {
    const exercises = [makeExercise("1"), makeExercise("2"), makeExercise("3")];
    mockListCompleted.mockResolvedValue(exercises as never);
    mockGetConfidence.mockImplementation(async (id) =>
      id === "2" ? undefined : makeConfidence(id, 90),
    );
    const snap = await getPerformanceSnapshotForThinkingType("analytical");
    expect(snap.sampleCount).toBe(2);
    expect(snap.rollingMean).toBe(90);
  });

  it("limits to ROLLING_WINDOW exercises", async () => {
    const exercises = Array.from({ length: ROLLING_WINDOW + 5 }, (_, i) => makeExercise(`${i}`));
    mockListCompleted.mockResolvedValue(exercises as never);
    mockGetConfidence.mockImplementation(async (id) => makeConfidence(id, 50));
    const snap = await getPerformanceSnapshotForThinkingType("analytical");
    expect(mockGetConfidence).toHaveBeenCalledTimes(ROLLING_WINDOW);
  });

  it("rounds mean to integer", async () => {
    const exercises = [makeExercise("1"), makeExercise("2"), makeExercise("3")];
    mockListCompleted.mockResolvedValue(exercises as never);
    mockGetConfidence.mockImplementation(async (id) => {
      const map: Record<string, number> = { "1": 33, "2": 33, "3": 34 };
      return makeConfidence(id, map[id] ?? 0);
    });
    const snap = await getPerformanceSnapshotForThinkingType("analytical");
    expect(snap.rollingMean).toBe(33);
  });
});
