import { describe, expect, it, vi, beforeEach } from "vitest";
import type { CachedTopicList } from "@/lib/types/topic-suggestion-cache";

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/db/firestore")>();
  return { ...orig, userDocRef: vi.fn((_col: string, id: string) => ({ id })) };
});
vi.mock("@/lib/db/e2e-firestore-memory", () => ({
  isE2EAuthBypass: vi.fn(() => false),
  e2eGetDoc: vi.fn(),
  e2eSetDoc: vi.fn(),
}));

import { getCachedTopicList, putCachedTopicList } from "./topic-suggestions-cache";
import { getDoc, setDoc } from "firebase/firestore";

const mockGetDoc = vi.mocked(getDoc);
const mockSetDoc = vi.mocked(setDoc);

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<CachedTopicList> = {}): CachedTopicList {
  return {
    id: "exercise:analytical",
    area: "analytical",
    kind: "exercise",
    suggestions: [{ title: "T1", blurb: "B1" }],
    shownTitles: ["T1"],
    moreClicksUsed: 0,
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getCachedTopicList", () => {
  it("returns undefined when no cached doc exists (forces a fresh AI fetch)", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as never);
    const result = await getCachedTopicList("exercise", "analytical");
    expect(result).toBeUndefined();
  });

  it("returns the cached row when a doc exists (skips the AI fetch)", async () => {
    const r = row();
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => r } as never);
    const result = await getCachedTopicList("exercise", "analytical");
    expect(result).toEqual(r);
  });
});

describe("putCachedTopicList", () => {
  it("writes via setDoc keyed by `${kind}:${area}`", async () => {
    const r = row();
    await putCachedTopicList(r);
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const [ref, data] = mockSetDoc.mock.calls[0];
    expect((ref as { id: string }).id).toBe("exercise:analytical");
    expect(data).toEqual(r);
  });

  it("overwrites the same doc id on a regenerate (kind:area stays the id, content changes)", async () => {
    await putCachedTopicList(row({ suggestions: [{ title: "New", blurb: "b" }], moreClicksUsed: 0 }));
    const [ref] = mockSetDoc.mock.calls[0];
    expect((ref as { id: string }).id).toBe("exercise:analytical");
  });
});
