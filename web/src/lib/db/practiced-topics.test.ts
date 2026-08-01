import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PracticedTopicEntry } from "@/lib/types/practiced-topic";

vi.mock("firebase/firestore", () => ({ setDoc: vi.fn() }));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", () => ({
  COGI_COLLECTIONS: { practicedTopics: "practicedTopics" },
  listCollectionRows: vi.fn(),
  userDocRef: vi.fn((_col: string, id: string) => ({ id })),
}));

import { recordPracticedTopic, listPracticedTitles, listPracticedTitleKeys, normalizeTitleKey } from "./practiced-topics";
import { listCollectionRows } from "@/lib/db/firestore";
import { setDoc } from "firebase/firestore";

const mockList = vi.mocked(listCollectionRows);
const mockSetDoc = vi.mocked(setDoc);

beforeEach(() => vi.clearAllMocks());

function entry(overrides: Partial<PracticedTopicEntry> = {}): PracticedTopicEntry {
  return {
    id: "p1",
    area: "analytical",
    title: "DevOps blue-green deployments",
    titleKey: "devops blue-green deployments",
    origin: "suggested",
    completedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeTitleKey", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeTitleKey("  DevOps   Blue-Green  ")).toBe("devops blue-green");
  });
});

describe("recordPracticedTopic", () => {
  it("creates a new row when none exists", async () => {
    mockList.mockResolvedValue([]);
    await recordPracticedTopic({ area: "analytical", title: "New Topic", origin: "suggested" });
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const written = mockSetDoc.mock.calls[0][1] as PracticedTopicEntry;
    expect(written.area).toBe("analytical");
    expect(written.title).toBe("New Topic");
    expect(written.titleKey).toBe("new topic");
    expect(written.origin).toBe("suggested");
  });

  it("upserts (reuses id) when a matching titleKey already exists in the same area", async () => {
    mockList.mockResolvedValue([entry({ id: "existing-id" })]);
    await recordPracticedTopic({
      area: "analytical",
      title: "DevOps Blue-Green Deployments",
      origin: "manual",
    });
    const written = mockSetDoc.mock.calls[0][1] as PracticedTopicEntry;
    expect(written.id).toBe("existing-id");
    expect(written.origin).toBe("manual");
  });

  it("does not match a titleKey from a different area", async () => {
    mockList.mockResolvedValue([entry({ area: "sequential" })]);
    await recordPracticedTopic({
      area: "analytical",
      title: "DevOps blue-green deployments",
      origin: "suggested",
    });
    const written = mockSetDoc.mock.calls[0][1] as PracticedTopicEntry;
    expect(written.id).not.toBe("p1");
  });

  it("is a no-op for an empty/whitespace title", async () => {
    await recordPracticedTopic({ area: "analytical", title: "   ", origin: "manual" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe("listPracticedTitles", () => {
  it("returns display titles filtered by area", async () => {
    mockList.mockResolvedValue([
      entry({ title: "A" }),
      entry({ id: "p2", area: "sequential", title: "B" }),
    ]);
    const result = await listPracticedTitles("analytical");
    expect(result).toEqual(["A"]);
  });
});

describe("listPracticedTitleKeys", () => {
  it("returns normalized keys as a Set", async () => {
    mockList.mockResolvedValue([entry({ title: "  Foo  Bar " })]);
    const result = await listPracticedTitleKeys("analytical");
    expect(result.has("foo bar")).toBe(true);
  });
});
