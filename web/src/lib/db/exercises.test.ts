import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Exercise } from "@/lib/types/exercise";

const mockDeleteDoc = vi.fn();
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/firestore")>()),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: (...a: unknown[]) => mockDeleteDoc(...a),
}));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/db/firestore")>();
  return { ...orig, listCollectionRows: vi.fn(), userDocRef: vi.fn(), subscribeCollectionRows: vi.fn() };
});

import {
  deleteExercise,
  listCompletedExercises,
  listIncompleteExercises,
  listRecentDomains,
} from "./exercises";
import { applyRowQuery, listCollectionRows, userDocRef, type RowQuery } from "@/lib/db/firestore";

const mockList = vi.mocked(listCollectionRows);

function ex(id: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id, type: "analytical", domain: "economics", title: `Ex ${id}`,
    passage: "p", embeddedIssues: [], validPoints: [{ textSegment: "t", explanation: "e" }],
    userHighlights: [], confidenceBefore: null, aiPerspective: null,
    createdAt: "2025-01-01T00:00:00Z", completedAt: "2025-01-02T00:00:00Z",
    ...overrides,
  } as Exercise;
}

const fixtures: Exercise[] = [
  ex("1", { completedAt: "2025-01-05", domain: "economics", type: "analytical" }),
  ex("2", { completedAt: "2025-01-03", domain: "tech", type: "evaluative" }),
  ex("3", { completedAt: "2025-01-04", domain: "Economics", type: "systems" }),
  ex("4", { completedAt: null, createdAt: "2025-01-06" }),
  ex("5", { completedAt: null, createdAt: "2025-01-07", currentStep: 2 }),
  // An unfinished exercise of a removed type: its page is gone, so it is not offered.
  { ...ex("6", { completedAt: null, createdAt: "2025-01-08", currentStep: 3 }), type: "sequential" } as unknown as Exercise,
];

/** The mocked Firestore read applies the query the same way the E2E store does. */
function serveRows(rows: Exercise[]) {
  mockList.mockImplementation((async (_name: string, q?: RowQuery) => applyRowQuery(rows, q)) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  serveRows(fixtures);
});

describe("listCompletedExercises", () => {
  it("asks Firestore for completed rows, newest first", async () => {
    await listCompletedExercises(undefined, 5);
    expect(mockList).toHaveBeenCalledWith("exercises", {
      where: { field: "completedAt", op: "!=", value: null },
      orderBy: { field: "completedAt", direction: "desc" },
      limit: 5,
    });
  });

  it("returns only completed exercises sorted newest first", async () => {
    const result = await listCompletedExercises();
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("3");
    expect(result[2].id).toBe("2");
  });

  it("filters by type", async () => {
    const result = await listCompletedExercises({ type: "analytical" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("type 'all' returns all completed", async () => {
    const result = await listCompletedExercises({ type: "all" });
    expect(result).toHaveLength(3);
  });

  it("filters by domainContains (case-insensitive)", async () => {
    const result = await listCompletedExercises({ domainContains: "econ" });
    expect(result).toHaveLength(2);
  });

  it("filters by completedAfter", async () => {
    const result = await listCompletedExercises({ completedAfter: "2025-01-04" });
    expect(result).toHaveLength(2);
  });

  it("filters by completedBefore", async () => {
    const result = await listCompletedExercises({ completedBefore: "2025-01-03" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("combines multiple filters", async () => {
    const result = await listCompletedExercises({
      domainContains: "econ", completedAfter: "2025-01-04",
    });
    expect(result).toHaveLength(2);
  });

  it("returns empty when no exercises match", async () => {
    const result = await listCompletedExercises({ domainContains: "biology" });
    expect(result).toEqual([]);
  });
});

describe("listIncompleteExercises", () => {
  it("returns started, unfinished exercises of the offered types", async () => {
    const result = await listIncompleteExercises();
    expect(result.map((e) => e.id)).toEqual(["5"]);
  });
});

describe("listRecentDomains", () => {
  it("returns domains sorted by frequency then recency", async () => {
    serveRows([
      ex("a", { domain: "econ", createdAt: "2025-01-01" }),
      ex("b", { domain: "econ", createdAt: "2025-01-02" }),
      ex("c", { domain: "tech", createdAt: "2025-01-03" }),
    ]);
    const result = await listRecentDomains();
    expect(result[0]).toBe("econ");
    expect(result[1]).toBe("tech");
  });

  it("respects limit", async () => {
    serveRows([
      ex("a", { domain: "a" }), ex("b", { domain: "b" }), ex("c", { domain: "c" }),
    ]);
    const result = await listRecentDomains(2);
    expect(result).toHaveLength(2);
  });

  it("skips empty domains", async () => {
    serveRows([
      ex("a", { domain: "" }), ex("b", { domain: "tech" }),
    ]);
    const result = await listRecentDomains();
    expect(result).toEqual(["tech"]);
  });

  it("breaks ties by latest createdAt", async () => {
    serveRows([
      ex("a", { domain: "alpha", createdAt: "2025-01-01" }),
      ex("b", { domain: "beta", createdAt: "2025-01-05" }),
    ]);
    const result = await listRecentDomains();
    expect(result[0]).toBe("beta");
  });
});

describe("deleteExercise", () => {
  it("deletes only the exercise doc", async () => {
    vi.mocked(userDocRef).mockReturnValue({ id: "ex9" } as never);
    await deleteExercise("ex9");
    expect(userDocRef).toHaveBeenCalledWith("exercises", "ex9");
    expect(mockDeleteDoc).toHaveBeenCalledWith({ id: "ex9" });
  });
});

describe("applyRowQuery", () => {
  const rows = [
    { id: "a", completedAt: "2025-01-02", createdAt: "2025-01-01" },
    { id: "b", completedAt: null, createdAt: "2025-01-03" },
    { id: "c", createdAt: "2025-01-02" },
    { id: "d", completedAt: "2025-01-05", createdAt: "2025-01-04" },
  ];

  it("treats a missing field as null, like Firestore", () => {
    const open = applyRowQuery(rows, { where: { field: "completedAt", op: "==", value: null } });
    expect(open.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("filters, orders and limits", () => {
    const out = applyRowQuery(rows, {
      where: { field: "completedAt", op: "!=", value: null },
      orderBy: { field: "completedAt", direction: "desc" },
      limit: 1,
    });
    expect(out.map((r) => r.id)).toEqual(["d"]);
  });
});
