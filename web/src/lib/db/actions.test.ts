import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActionBridge } from "@/lib/types/action";

vi.mock("firebase/firestore", () => ({
  setDoc: vi.fn(),
}));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", () => ({
  COGI_COLLECTIONS: { actions: "actions", exercises: "exercises" },
  listCollectionRows: vi.fn(),
  userDocRef: vi.fn((_col: string, id: string) => ({ id })),
  subscribeCollectionRows: vi.fn(),
}));

import { listActionsWithExerciseMeta, currentIsoWeekKey, toggleActionFollowThroughWeek } from "./actions";
import { listCollectionRows } from "@/lib/db/firestore";
import { setDoc } from "firebase/firestore";

const mockList = vi.mocked(listCollectionRows);
const mockSetDoc = vi.mocked(setDoc);

beforeEach(() => vi.clearAllMocks());

describe("listActionsWithExerciseMeta", () => {
  it("joins actions with exercise titles", async () => {
    mockList.mockImplementation(async (col) => {
      if (col === "actions") {
        return [
          { id: "a1", exerciseId: "ex1", oneAction: "Do X", weeklyFollowThrough: [], createdAt: "2025-01-01" },
        ];
      }
      if (col === "exercises") {
        return [{ id: "ex1", title: "My Exercise", createdAt: "2025-01-01" }];
      }
      return [];
    });
    const result = await listActionsWithExerciseMeta();
    expect(result).toHaveLength(1);
    expect(result[0].exerciseTitle).toBe("My Exercise");
  });

  it("uses (unknown) for missing exercise", async () => {
    mockList.mockImplementation(async (col) => {
      if (col === "actions") {
        return [{ id: "a1", exerciseId: "missing", oneAction: "X", weeklyFollowThrough: [], createdAt: "2025-01-01" }];
      }
      return [];
    });
    const result = await listActionsWithExerciseMeta();
    expect(result[0].exerciseTitle).toBe("(unknown)");
  });

  it("sorts by exercise createdAt descending", async () => {
    mockList.mockImplementation(async (col) => {
      if (col === "actions") {
        return [
          { id: "a1", exerciseId: "ex1", oneAction: "X", weeklyFollowThrough: [], createdAt: "2025-01-01" },
          { id: "a2", exerciseId: "ex2", oneAction: "Y", weeklyFollowThrough: [], createdAt: "2025-01-02" },
        ];
      }
      if (col === "exercises") {
        return [
          { id: "ex1", title: "Old", createdAt: "2025-01-01" },
          { id: "ex2", title: "New", createdAt: "2025-01-05" },
        ];
      }
      return [];
    });
    const result = await listActionsWithExerciseMeta();
    expect(result[0].exerciseTitle).toBe("New");
  });
});

describe("currentIsoWeekKey", () => {
  it("returns string in YYYY-WNN format", () => {
    const key = currentIsoWeekKey();
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("toggleActionFollowThroughWeek", () => {
  it("adds new week entry when not present", async () => {
    const row: ActionBridge = {
      id: "a1", exerciseId: "ex1", oneAction: "Do X",
      weeklyFollowThrough: [], createdAt: "2025-01-01",
    };
    await toggleActionFollowThroughWeek(row, "2025-W05");
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const written = mockSetDoc.mock.calls[0][1] as ActionBridge;
    expect(written.weeklyFollowThrough).toEqual([{ weekKey: "2025-W05", done: true }]);
  });

  it("toggles existing week entry", async () => {
    const row: ActionBridge = {
      id: "a1", exerciseId: "ex1", oneAction: "Do X",
      weeklyFollowThrough: [{ weekKey: "2025-W05", done: true }],
      createdAt: "2025-01-01",
    };
    await toggleActionFollowThroughWeek(row, "2025-W05");
    const written = mockSetDoc.mock.calls[0][1] as ActionBridge;
    expect(written.weeklyFollowThrough).toEqual([{ weekKey: "2025-W05", done: false }]);
  });

  it("preserves other week entries", async () => {
    const row: ActionBridge = {
      id: "a1", exerciseId: "ex1", oneAction: "Do X",
      weeklyFollowThrough: [
        { weekKey: "2025-W04", done: true },
        { weekKey: "2025-W05", done: false },
      ],
      createdAt: "2025-01-01",
    };
    await toggleActionFollowThroughWeek(row, "2025-W05");
    const written = mockSetDoc.mock.calls[0][1] as ActionBridge;
    expect(written.weeklyFollowThrough).toHaveLength(2);
    expect(written.weeklyFollowThrough[0]).toEqual({ weekKey: "2025-W04", done: true });
    expect(written.weeklyFollowThrough[1]).toEqual({ weekKey: "2025-W05", done: true });
  });
});
