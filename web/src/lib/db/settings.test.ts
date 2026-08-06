import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
vi.mock("firebase/firestore", () => ({
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));
vi.mock("@/lib/auth/firebase-client", () => ({
  getCurrentUidOrThrow: vi.fn(() => "uid1"),
  getFirebaseFirestore: vi.fn(() => ({})),
}));
vi.mock("@/lib/db/firestore", () => ({
  COGI_COLLECTIONS: { settings: "settings" },
  userDocRef: vi.fn((_col: string, id: string) => ({ id })),
  subscribeCollectionRows: vi.fn(),
}));

import {
  getAppSettings,
  getUserContext,
  setUserContext,
  setDelayedRecallEnabled,
  setAdaptiveDifficultyEnabled,
} from "./settings";

function mockSnapshot(data: Record<string, unknown> | null) {
  mockGetDoc.mockResolvedValue({
    exists: () => data !== null,
    data: () => data,
  });
}

beforeEach(() => vi.clearAllMocks());

describe("getAppSettings", () => {
  it("returns defaults when no settings exist", async () => {
    mockSnapshot(null);
    const s = await getAppSettings();
    expect(s.id).toBe("app");
    expect(s.userContext).toBe("");
    expect(s.delayedRecallEnabled).toBe(true);
    expect(s.adaptiveDifficultyEnabled).toBe(false);
  });

  it("reads stored values", async () => {
    mockSnapshot({
      userContext: "senior analyst",
      delayedRecallEnabled: false,
      adaptiveDifficultyEnabled: true,
      geopoliticsProgressionEpoch: "2025-01-01",
    });
    const s = await getAppSettings();
    expect(s.userContext).toBe("senior analyst");
    expect(s.delayedRecallEnabled).toBe(false);
    expect(s.adaptiveDifficultyEnabled).toBe(true);
    expect(s.geopoliticsProgressionEpoch).toBe("2025-01-01");
  });

  it("defaults delayedRecallEnabled to true when field missing", async () => {
    mockSnapshot({ userContext: "test" });
    const s = await getAppSettings();
    expect(s.delayedRecallEnabled).toBe(true);
  });
});

describe("getUserContext", () => {
  it("returns empty string when no settings", async () => {
    mockSnapshot(null);
    expect(await getUserContext()).toBe("");
  });

  it("returns stored context", async () => {
    mockSnapshot({ userContext: "data scientist" });
    expect(await getUserContext()).toBe("data scientist");
  });
});

describe("setUserContext", () => {
  it("writes settings preserving existing fields", async () => {
    mockSnapshot({ userContext: "old", delayedRecallEnabled: false });
    await setUserContext("new context");
    expect(mockSetDoc).toHaveBeenCalledOnce();
    const written = mockSetDoc.mock.calls[0][1];
    expect(written.userContext).toBe("new context");
    expect(written.delayedRecallEnabled).toBe(false);
  });
});

describe("setDelayedRecallEnabled", () => {
  it("toggles delayed recall setting", async () => {
    mockSnapshot({ userContext: "test", delayedRecallEnabled: true });
    await setDelayedRecallEnabled(false);
    const written = mockSetDoc.mock.calls[0][1];
    expect(written.delayedRecallEnabled).toBe(false);
  });
});

describe("setAdaptiveDifficultyEnabled", () => {
  it("toggles adaptive difficulty setting", async () => {
    mockSnapshot({ userContext: "test", adaptiveDifficultyEnabled: false });
    await setAdaptiveDifficultyEnabled(true);
    const written = mockSetDoc.mock.calls[0][1];
    expect(written.adaptiveDifficultyEnabled).toBe(true);
  });

  it("never writes undefined fields (Firestore rejects them)", async () => {
    // No weeklyReviewLastCompletedCount / geopoliticsProgressionEpoch stored yet -
    // spreading `prev?.field` straight through would otherwise leave `undefined`.
    mockSnapshot({ userContext: "test" });
    await setAdaptiveDifficultyEnabled(true);
    const written = mockSetDoc.mock.calls[0][1];
    for (const [key, value] of Object.entries(written)) {
      expect(value, `field "${key}" must not be undefined`).not.toBeUndefined();
    }
    expect("weeklyReviewLastCompletedCount" in written).toBe(false);
    expect("geopoliticsProgressionEpoch" in written).toBe(false);
  });
});
