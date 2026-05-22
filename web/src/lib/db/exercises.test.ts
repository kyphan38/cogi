import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Exercise } from "@/lib/types/exercise";

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  writeBatch: vi.fn(() => ({ delete: vi.fn(), commit: vi.fn() })),
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
  listCompletedExercises,
  listRecentCompletedExercises,
  countCompletedByType,
  listIncompleteExercises,
  listRecentDomains,
} from "./exercises";
import { listCollectionRows } from "@/lib/db/firestore";

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
  ex("2", { completedAt: "2025-01-03", domain: "tech", type: "sequential" }),
  ex("3", { completedAt: "2025-01-04", domain: "Economics", type: "systems" }),
  ex("4", { completedAt: null, createdAt: "2025-01-06" }),
  ex("5", { completedAt: null, createdAt: "2025-01-07", currentStep: 2 }),
];

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue(fixtures as never);
});

describe("listCompletedExercises", () => {
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
    const result = await listCompletedExercises({ type: "generative" });
    expect(result).toEqual([]);
  });
});

describe("listRecentCompletedExercises", () => {
  it("returns first N completed exercises", async () => {
    const result = await listRecentCompletedExercises(2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
  });
});

describe("countCompletedByType", () => {
  it("counts exercises of given type", async () => {
    expect(await countCompletedByType("analytical")).toBe(1);
    expect(await countCompletedByType("systems")).toBe(1);
    expect(await countCompletedByType("generative")).toBe(0);
  });
});

describe("listIncompleteExercises", () => {
  it("returns exercises with null completedAt and currentStep > 0", async () => {
    const result = await listIncompleteExercises();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("5");
  });
});

describe("listRecentDomains", () => {
  it("returns domains sorted by frequency then recency", async () => {
    mockList.mockResolvedValue([
      ex("a", { domain: "econ", createdAt: "2025-01-01" }),
      ex("b", { domain: "econ", createdAt: "2025-01-02" }),
      ex("c", { domain: "tech", createdAt: "2025-01-03" }),
    ] as never);
    const result = await listRecentDomains();
    expect(result[0]).toBe("econ");
    expect(result[1]).toBe("tech");
  });

  it("respects limit", async () => {
    mockList.mockResolvedValue([
      ex("a", { domain: "a" }), ex("b", { domain: "b" }), ex("c", { domain: "c" }),
    ] as never);
    const result = await listRecentDomains(2);
    expect(result).toHaveLength(2);
  });

  it("skips empty domains", async () => {
    mockList.mockResolvedValue([
      ex("a", { domain: "" }), ex("b", { domain: "tech" }),
    ] as never);
    const result = await listRecentDomains();
    expect(result).toEqual(["tech"]);
  });

  it("breaks ties by latest createdAt", async () => {
    mockList.mockResolvedValue([
      ex("a", { domain: "alpha", createdAt: "2025-01-01" }),
      ex("b", { domain: "beta", createdAt: "2025-01-05" }),
    ] as never);
    const result = await listRecentDomains();
    expect(result[0]).toBe("beta");
  });
});
