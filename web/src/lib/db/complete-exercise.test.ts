import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Exercise, ConfidenceRecord } from "@/lib/types/exercise";
import type { JournalEntry } from "@/lib/types/journal";
import type { ActionBridge } from "@/lib/types/action";

const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();
vi.mock("firebase/firestore", () => ({
  writeBatch: vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit })),
}));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", () => ({
  COGI_COLLECTIONS: {
    exercises: "exercises", journalEntries: "journalEntries",
    confidenceRecords: "confidenceRecords", actions: "actions",
    delayedRecallQueue: "delayedRecallQueue", settings: "settings",
  },
  userDocRef: vi.fn((_col: string, id: string) => ({ id })),
}));
vi.mock("@/lib/db/settings", () => ({
  getAppSettings: vi.fn(),
}));
vi.mock("@/lib/adaptive/record-weaknesses", () => ({
  recordWeaknessesAfterExercise: vi.fn(),
}));
vi.mock("@/lib/db/strip-undefined-deep", () => ({
  stripUndefinedDeep: vi.fn((v: unknown) => v),
}));
vi.mock("@/lib/db/practiced-topics", () => ({
  recordPracticedTopic: vi.fn(),
}));

import { completeExerciseFlow } from "./complete-exercise";
import { getAppSettings } from "@/lib/db/settings";
import { recordWeaknessesAfterExercise } from "@/lib/adaptive/record-weaknesses";
import { recordPracticedTopic } from "@/lib/db/practiced-topics";

const mockGetAppSettings = vi.mocked(getAppSettings);

const exercise = {
  id: "ex1", type: "analytical", domain: "test", title: "Test",
  passage: "p", embeddedIssues: [], validPoints: [{ textSegment: "t", explanation: "e" }],
  userHighlights: [], confidenceBefore: 70, aiPerspective: null,
  createdAt: "2025-01-01T00:00:00Z", completedAt: "2025-01-02T00:00:00Z",
} as unknown as Exercise;

const journal: JournalEntry = {
  id: "j1", exerciseId: "ex1", promptIds: ["p1"],
  aiReferenceLine: null, responses: { p1: "text" }, createdAt: "2025-01-02",
};

const confidence: ConfidenceRecord = {
  id: "c1", exerciseId: "ex1", confidenceBefore: 70,
  actualAccuracy: 65, gap: 5, createdAt: "2025-01-02",
};

const action: ActionBridge = {
  id: "a1", exerciseId: "ex1", oneAction: "Do something",
  weeklyFollowThrough: [], createdAt: "2025-01-02",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
});

describe("completeExerciseFlow", () => {
  it("writes exercise, journal, confidence, action in batch", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: false,
    });
    await completeExerciseFlow({ exercise, journal, confidence, action });
    expect(mockBatchSet).toHaveBeenCalledTimes(4);
    expect(mockBatchCommit).toHaveBeenCalledOnce();
  });

  it("adds recall row when delayedRecallEnabled is true", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: true,
    });
    await completeExerciseFlow({ exercise, journal, confidence, action });
    expect(mockBatchSet).toHaveBeenCalledTimes(5);
  });

  it("skips recall row when delayedRecallEnabled is false", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: false,
    });
    await completeExerciseFlow({ exercise, journal, confidence, action });
    expect(mockBatchSet).toHaveBeenCalledTimes(4);
  });

  it("calls recordWeaknessesAfterExercise", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: false,
    });
    await completeExerciseFlow({ exercise, journal, confidence, action });
    expect(recordWeaknessesAfterExercise).toHaveBeenCalledWith(exercise, confidence);
  });

  it("does not throw if weakness recording fails", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: false,
    });
    vi.mocked(recordWeaknessesAfterExercise).mockRejectedValue(new Error("fail"));
    await expect(
      completeExerciseFlow({ exercise, journal, confidence, action }),
    ).resolves.toBeUndefined();
  });

  it("defaults delayedRecallEnabled to true when not explicitly false", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "",
    } as never);
    await completeExerciseFlow({ exercise, journal, confidence, action });
    expect(mockBatchSet).toHaveBeenCalledTimes(5);
  });

  it("records the exercise's domain as a practiced topic", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: false,
    });
    await completeExerciseFlow({ exercise, journal, confidence, action });
    expect(recordPracticedTopic).toHaveBeenCalledWith({
      area: "analytical",
      title: "test",
      origin: "manual",
    });
  });

  it("does not record a practiced topic for combo exercises", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: false,
    });
    const comboExercise = { ...exercise, type: "combo" } as unknown as Exercise;
    await completeExerciseFlow({ exercise: comboExercise, journal, confidence, action });
    expect(recordPracticedTopic).not.toHaveBeenCalled();
  });

  it("does not throw if practiced-topic recording fails", async () => {
    mockGetAppSettings.mockResolvedValue({
      id: "app", userContext: "", delayedRecallEnabled: false,
    });
    vi.mocked(recordPracticedTopic).mockRejectedValue(new Error("fail"));
    await expect(
      completeExerciseFlow({ exercise, journal, confidence, action }),
    ).resolves.toBeUndefined();
  });
});
