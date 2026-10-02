import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Exercise } from "@/lib/types/exercise";

vi.mock("@/lib/db/practiced-topics", () => ({
  recordPracticedTopic: vi.fn(),
}));
const mockPutExercise = vi.fn();
vi.mock("@/lib/db/exercises", () => ({
  putExercise: (ex: unknown) => mockPutExercise(ex),
}));

import { completePracticeExercise } from "./complete-exercise";
import { recordPracticedTopic } from "@/lib/db/practiced-topics";

const exercise = {
  id: "ex1", type: "analytical", domain: "test", title: "Test",
  passage: "p", embeddedIssues: [], validPoints: [{ textSegment: "t", explanation: "e" }],
  userHighlights: [], confidenceBefore: 70, aiPerspective: null,
  createdAt: "2025-01-01T00:00:00Z", completedAt: "2025-01-02T00:00:00Z",
} as unknown as Exercise;

describe("completePracticeExercise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPutExercise.mockResolvedValue(undefined);
  });

  it("writes only the exercise doc, with completedAt and the trimmed takeaway", async () => {
    const open = { ...exercise, completedAt: null } as unknown as Exercise;
    const saved = await completePracticeExercise({ exercise: open, takeaway: "  check base rates  " });
    expect(mockPutExercise).toHaveBeenCalledTimes(1);
    const written = mockPutExercise.mock.calls[0][0] as Exercise & { takeaway: string | null };
    expect(written.takeaway).toBe("check base rates");
    expect(written.completedAt).toEqual(expect.any(String));
    expect(saved.completedAt).toBe(written.completedAt);
    expect(recordPracticedTopic).toHaveBeenCalledWith(expect.objectContaining({ area: "analytical", title: "test" }));
  });

  it("stores an empty takeaway as null and keeps an existing completedAt", async () => {
    await completePracticeExercise({ exercise, takeaway: "   " });
    const written = mockPutExercise.mock.calls[0][0] as Exercise & { takeaway: string | null };
    expect(written.takeaway).toBeNull();
    expect(written.completedAt).toBe("2025-01-02T00:00:00Z");
  });
});

