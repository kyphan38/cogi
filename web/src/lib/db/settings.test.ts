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
}));

import {
  dismissLevelSuggestion,
  getAppSettings,
  getPracticeLevel,
  getLanguageLevelForRequest,
  getUserContext,
  setLanguageLevel,
  setPracticeLevel,
  setUserContext,
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
    expect(s).toEqual({ id: "app", userContext: "", languageLevel: "Intermediate", practiceLevels: {}, levelSuggestionDismissedAt: {} });
  });

  it("reads stored values and drops fields of removed features", async () => {
    mockSnapshot({
      userContext: "senior analyst",
      languageLevel: "Advanced",
      delayedRecallEnabled: false,
      adaptiveDifficultyEnabled: true,
    });
    const s = await getAppSettings();
    expect(s).toEqual({
      id: "app",
      userContext: "senior analyst",
      languageLevel: "Advanced",
      practiceLevels: {},
      levelSuggestionDismissedAt: {},
    });
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
  it("writes the context and keeps the language level", async () => {
    mockSnapshot({ userContext: "old", languageLevel: "Advanced" });
    await setUserContext("new context");
    expect(mockSetDoc).toHaveBeenCalledOnce();
    expect(mockSetDoc.mock.calls[0][1]).toEqual({
      id: "app",
      userContext: "new context",
      languageLevel: "Advanced",
      practiceLevels: {},
      levelSuggestionDismissedAt: {},
    });
  });
});

describe("setLanguageLevel", () => {
  it("writes the level and keeps the context, with no undefined fields", async () => {
    mockSnapshot({ userContext: "test" });
    await setLanguageLevel("Foundation");
    const written = mockSetDoc.mock.calls[0][1];
    expect(written).toEqual({
      id: "app",
      userContext: "test",
      languageLevel: "Foundation",
      practiceLevels: {},
      levelSuggestionDismissedAt: {},
    });
    for (const [key, value] of Object.entries(written)) {
      expect(value, `field "${key}" must not be undefined`).not.toBeUndefined();
    }
  });
});

describe("getLanguageLevelForRequest", () => {
  it("falls back to the default level", async () => {
    mockSnapshot({ userContext: "x" });
    expect(await getLanguageLevelForRequest()).toBe("Intermediate");
  });
});

describe("practice levels", () => {
  it("defaults to Guided and ignores unknown values", async () => {
    mockSnapshot(null);
    expect(await getPracticeLevel("analytical")).toBe("guided");
    mockSnapshot({ practiceLevels: { analytical: "hard" } });
    expect(await getPracticeLevel("analytical")).toBe("guided");
  });

  it("saves a level per type and keeps the others", async () => {
    mockSnapshot({ userContext: "x", practiceLevels: { systems: "expert" } });
    await setPracticeLevel("analytical", "standard");
    expect(mockSetDoc.mock.calls[0][1].practiceLevels).toEqual({ systems: "expert", analytical: "standard" });
  });

  it("records when a suggestion was dismissed", async () => {
    mockSnapshot({ userContext: "x" });
    await dismissLevelSuggestion("analytical");
    const at = mockSetDoc.mock.calls[0][1].levelSuggestionDismissedAt.analytical;
    expect(Number.isNaN(Date.parse(at))).toBe(false);
  });
});
