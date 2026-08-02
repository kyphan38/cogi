import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ActiveMathSession } from "@/lib/types/math-session";

vi.mock("firebase/firestore", () => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/db/firestore")>();
  return { ...orig, listCollectionRows: vi.fn(), userDocRef: vi.fn((_col: string, id: string) => ({ id })) };
});
vi.mock("@/lib/db/e2e-firestore-memory", () => ({
  isE2EAuthBypass: vi.fn(() => false),
  e2eGetDoc: vi.fn(),
  e2eSetDoc: vi.fn(),
  e2eDeleteDoc: vi.fn(),
}));

import {
  deleteActiveMathSession,
  getActiveMathSession,
  listActiveMathSessions,
  putActiveMathSession,
} from "./math-sessions";
import { listCollectionRows } from "@/lib/db/firestore";
import { deleteDoc, getDoc, setDoc } from "firebase/firestore";

const mockGetDoc = vi.mocked(getDoc);
const mockSetDoc = vi.mocked(setDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);
const mockList = vi.mocked(listCollectionRows);

beforeEach(() => vi.clearAllMocks());

function session(overrides: Partial<ActiveMathSession> = {}): ActiveMathSession {
  return {
    id: "scenario-1",
    topic: "expected_value",
    title: "Should you buy the warranty?",
    isAiDraft: false,
    loopState: "struggle",
    committedData: null,
    struggleMessages: [],
    teachBackMessages: [],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:05:00.000Z",
    ...overrides,
  };
}

describe("getActiveMathSession", () => {
  it("returns undefined when no session doc exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false } as never);
    const result = await getActiveMathSession("scenario-1");
    expect(result).toBeUndefined();
  });

  it("returns the persisted session when one exists", async () => {
    const s = session();
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => s } as never);
    const result = await getActiveMathSession("scenario-1");
    expect(result).toEqual(s);
  });
});

describe("putActiveMathSession", () => {
  it("writes via setDoc keyed by the session (scenario) id", async () => {
    const s = session();
    await putActiveMathSession(s);
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const [ref, data] = mockSetDoc.mock.calls[0];
    expect((ref as { id: string }).id).toBe("scenario-1");
    expect(data).toEqual(s);
  });

  it("strips undefined fields (e.g. scenarioSnapshot on a non-draft) before writing", async () => {
    await putActiveMathSession(session({ scenarioSnapshot: undefined }));
    const [, data] = mockSetDoc.mock.calls[0];
    expect(data).not.toHaveProperty("scenarioSnapshot");
  });
});

describe("deleteActiveMathSession", () => {
  it("deletes the session doc (called on scenario completion)", async () => {
    await deleteActiveMathSession("scenario-1");
    expect(mockDeleteDoc).toHaveBeenCalledOnce();
    const [ref] = mockDeleteDoc.mock.calls[0];
    expect((ref as { id: string }).id).toBe("scenario-1");
  });
});

describe("listActiveMathSessions", () => {
  it("returns sessions newest-updated first", async () => {
    mockList.mockResolvedValue([
      session({ id: "old", updatedAt: "2025-01-01T00:00:00.000Z" }),
      session({ id: "new", updatedAt: "2025-01-03T00:00:00.000Z" }),
      session({ id: "mid", updatedAt: "2025-01-02T00:00:00.000Z" }),
    ]);
    const result = await listActiveMathSessions();
    expect(result.map((s) => s.id)).toEqual(["new", "mid", "old"]);
  });
});
