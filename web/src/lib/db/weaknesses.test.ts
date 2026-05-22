import { describe, expect, it, vi, beforeEach } from "vitest";
import type { WeaknessEntry } from "@/lib/types/weakness";

vi.mock("firebase/firestore", () => ({ setDoc: vi.fn() }));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", () => ({
  COGI_COLLECTIONS: { weaknesses: "weaknesses" },
  listCollectionRows: vi.fn(),
  userDocRef: vi.fn((_col: string, id: string) => ({ id })),
  subscribeCollectionRows: vi.fn(),
}));

import { upsertMiss, recordHit, listActiveWeaknessTypes, listTopActiveWeaknesses } from "./weaknesses";
import { listCollectionRows } from "@/lib/db/firestore";
import { setDoc } from "firebase/firestore";

const mockList = vi.mocked(listCollectionRows);
const mockSetDoc = vi.mocked(setDoc);

beforeEach(() => vi.clearAllMocks());

function weakness(overrides: Partial<WeaknessEntry> = {}): WeaknessEntry {
  return {
    id: "w1", thinkingGroup: "analytical", type: "bias",
    missCount: 1, hitCount: 0, status: "active", lastSeen: "2025-01-01",
    ...overrides,
  };
}

describe("upsertMiss", () => {
  it("creates new weakness when none exists", async () => {
    mockList.mockResolvedValue([]);
    await upsertMiss("analytical", "bias");
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const written = mockSetDoc.mock.calls[0][1] as WeaknessEntry;
    expect(written.missCount).toBe(1);
    expect(written.hitCount).toBe(0);
    expect(written.status).toBe("active");
  });

  it("increments missCount on existing active weakness", async () => {
    mockList.mockResolvedValue([weakness({ missCount: 3 })]);
    await upsertMiss("analytical", "bias");
    const written = mockSetDoc.mock.calls[0][1] as WeaknessEntry;
    expect(written.missCount).toBe(4);
  });

  it("reactivates resolved weakness and resets hitCount", async () => {
    mockList.mockResolvedValue([weakness({ status: "resolved", hitCount: 3, missCount: 2 })]);
    await upsertMiss("analytical", "bias");
    const written = mockSetDoc.mock.calls[0][1] as WeaknessEntry;
    expect(written.status).toBe("active");
    expect(written.hitCount).toBe(0);
    expect(written.missCount).toBe(3);
  });
});

describe("recordHit", () => {
  it("increments hitCount on active weakness", async () => {
    mockList.mockResolvedValue([weakness({ hitCount: 1 })]);
    await recordHit("analytical", "bias");
    const written = mockSetDoc.mock.calls[0][1] as WeaknessEntry;
    expect(written.hitCount).toBe(2);
  });

  it("resolves weakness after 3 hits", async () => {
    mockList.mockResolvedValue([weakness({ hitCount: 2 })]);
    await recordHit("analytical", "bias");
    const written = mockSetDoc.mock.calls[0][1] as WeaknessEntry;
    expect(written.hitCount).toBe(3);
    expect(written.status).toBe("resolved");
  });

  it("does nothing when weakness not found", async () => {
    mockList.mockResolvedValue([]);
    await recordHit("analytical", "bias");
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("does nothing when weakness is already resolved", async () => {
    mockList.mockResolvedValue([weakness({ status: "resolved" })]);
    await recordHit("analytical", "bias");
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe("listActiveWeaknessTypes", () => {
  it("returns active weakness types sorted by missCount", async () => {
    mockList.mockResolvedValue([
      weakness({ type: "bias", missCount: 2, thinkingGroup: "analytical" }),
      weakness({ id: "w2", type: "fallacy", missCount: 5, thinkingGroup: "analytical" }),
      weakness({ id: "w3", type: "assumption", missCount: 1, status: "resolved", thinkingGroup: "analytical" }),
    ]);
    const result = await listActiveWeaknessTypes("analytical", 10);
    expect(result).toEqual(["fallacy", "bias"]);
  });

  it("respects limit", async () => {
    mockList.mockResolvedValue([
      weakness({ type: "a", missCount: 3 }),
      weakness({ id: "w2", type: "b", missCount: 2 }),
      weakness({ id: "w3", type: "c", missCount: 1 }),
    ]);
    const result = await listActiveWeaknessTypes("analytical", 2);
    expect(result).toHaveLength(2);
  });

  it("deduplicates types", async () => {
    mockList.mockResolvedValue([
      weakness({ type: "bias", missCount: 3 }),
      weakness({ id: "w2", type: "bias", missCount: 1 }),
    ]);
    const result = await listActiveWeaknessTypes("analytical", 10);
    expect(result).toEqual(["bias"]);
  });

  it("filters by thinkingGroup", async () => {
    mockList.mockResolvedValue([
      weakness({ type: "bias", thinkingGroup: "analytical" }),
      weakness({ id: "w2", type: "order", thinkingGroup: "sequential" as never }),
    ]);
    const result = await listActiveWeaknessTypes("analytical", 10);
    expect(result).toEqual(["bias"]);
  });
});

describe("listTopActiveWeaknesses", () => {
  it("returns top N active weaknesses across all groups", async () => {
    mockList.mockResolvedValue([
      weakness({ missCount: 5 }),
      weakness({ id: "w2", missCount: 3 }),
      weakness({ id: "w3", missCount: 1, status: "resolved" }),
    ]);
    const result = await listTopActiveWeaknesses(10);
    expect(result).toHaveLength(2);
    expect(result[0].missCount).toBe(5);
  });
});
