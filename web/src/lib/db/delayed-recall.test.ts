import { describe, expect, it, vi, beforeEach } from "vitest";
import type { DelayedRecallQueueRow } from "@/lib/types/insights";

const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();
vi.mock("firebase/firestore", () => ({
  setDoc: vi.fn(),
  writeBatch: vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit })),
}));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", () => ({
  COGI_COLLECTIONS: { delayedRecallQueue: "delayedRecallQueue" },
  listCollectionRows: vi.fn(),
  userDocRef: vi.fn((_col: string, id: string) => ({ id })),
  subscribeCollectionRows: vi.fn(),
}));

import { getNextDueRecall, expireStalePendingRecalls } from "./delayed-recall";
import { listCollectionRows } from "@/lib/db/firestore";

const mockList = vi.mocked(listCollectionRows);

beforeEach(() => {
  vi.clearAllMocks();
  mockBatchCommit.mockResolvedValue(undefined);
});

function recall(overrides: Partial<DelayedRecallQueueRow> = {}): DelayedRecallQueueRow {
  return {
    id: "r1", exerciseId: "ex1", exerciseTitle: "Title",
    completedAt: "2025-01-01T00:00:00Z", dueAt: "2025-01-03T00:00:00Z",
    status: "pending", userAnswer: null, feedbackText: null,
    dismissedAt: null, answeredAt: null,
    ...overrides,
  };
}

describe("getNextDueRecall", () => {
  it("returns oldest due pending recall", async () => {
    const now = new Date().toISOString();
    mockList.mockResolvedValue([
      recall({ id: "r1", dueAt: "2020-01-01T00:00:00Z" }),
      recall({ id: "r2", dueAt: "2020-01-02T00:00:00Z" }),
    ]);
    const result = await getNextDueRecall();
    expect(result?.id).toBe("r1");
  });

  it("skips non-pending rows", async () => {
    mockList.mockResolvedValue([
      recall({ status: "answered", dueAt: "2020-01-01T00:00:00Z" }),
      recall({ id: "r2", status: "pending", dueAt: "2020-01-01T00:00:00Z" }),
    ]);
    const result = await getNextDueRecall();
    expect(result?.id).toBe("r2");
  });

  it("skips future due rows", async () => {
    mockList.mockResolvedValue([
      recall({ dueAt: "2099-01-01T00:00:00Z" }),
    ]);
    const result = await getNextDueRecall();
    expect(result).toBeUndefined();
  });

  it("returns undefined when queue is empty", async () => {
    mockList.mockResolvedValue([]);
    expect(await getNextDueRecall()).toBeUndefined();
  });
});

describe("expireStalePendingRecalls", () => {
  it("expires pending rows older than 7 days", async () => {
    const nowMs = new Date("2025-01-15T00:00:00Z").getTime();
    mockList.mockResolvedValue([
      recall({ id: "r1", dueAt: "2025-01-01T00:00:00Z" }),
      recall({ id: "r2", dueAt: "2025-01-14T00:00:00Z" }),
    ]);
    await expireStalePendingRecalls(nowMs);
    expect(mockBatchSet).toHaveBeenCalledOnce();
    const written = mockBatchSet.mock.calls[0][1] as DelayedRecallQueueRow & { expiredAt: string };
    expect(written.id).toBe("r1");
    expect(written.status).toBe("expired");
    expect(written.expiredAt).toBeTruthy();
  });

  it("does nothing when no stale rows", async () => {
    const nowMs = new Date("2025-01-05T00:00:00Z").getTime();
    mockList.mockResolvedValue([
      recall({ dueAt: "2025-01-04T00:00:00Z" }),
    ]);
    await expireStalePendingRecalls(nowMs);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("skips non-pending rows", async () => {
    const nowMs = new Date("2025-06-01T00:00:00Z").getTime();
    mockList.mockResolvedValue([
      recall({ status: "answered", dueAt: "2025-01-01T00:00:00Z" }),
    ]);
    await expireStalePendingRecalls(nowMs);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});
