import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AnalyticalExerciseRow, AnalyticalResult } from "@/lib/types/exercise";

const mockList = vi.fn();
const mockSettings = vi.fn();
vi.mock("@/lib/db/exercises", () => ({ listCompletedExercises: (...a: unknown[]) => mockList(...a) }));
vi.mock("@/lib/db/settings", () => ({ getAppSettings: () => mockSettings() }));

import { analyticalLevelSuggestion } from "./level-suggestion";

const good: AnalyticalResult = {
  issues: [], decoys: [], extraHighlightIds: [],
  found: 4, total: 4, tagsCorrect: 4, trapsHit: 0, decoyTotal: 2,
};

function row(completedAt: string, extra: Partial<AnalyticalExerciseRow> = {}): AnalyticalExerciseRow {
  return {
    id: completedAt, type: "analytical", domain: "d", title: "t", passage: "p",
    embeddedIssues: [], validPoints: [], userHighlights: [], result: good, level: "guided",
    confidenceBefore: 50, aiPerspective: null, createdAt: completedAt, completedAt, ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings.mockResolvedValue({ levelSuggestionDismissedAt: {} });
});

describe("analyticalLevelSuggestion", () => {
  it("suggests Standard after three good guided exercises", async () => {
    mockList.mockResolvedValue([row("2026-10-03"), row("2026-10-02"), row("2026-10-01")]);
    expect(await analyticalLevelSuggestion("guided")).toEqual({ direction: "up", to: "standard" });
  });

  it("ignores other levels, geopolitics rows and rows without a level", async () => {
    mockList.mockResolvedValue([
      row("2026-10-04"),
      row("2026-10-03", { level: "standard" }),
      row("2026-10-02", { isGeopolitics: true }),
      row("2026-10-01", { level: undefined }),
      row("2026-09-30"),
    ]);
    expect(await analyticalLevelSuggestion("guided")).toBeNull();
  });

  it("only counts exercises finished after the last Not now", async () => {
    mockList.mockResolvedValue([row("2026-10-03"), row("2026-10-02"), row("2026-10-01")]);
    mockSettings.mockResolvedValue({ levelSuggestionDismissedAt: { analytical: "2026-10-01T12:00:00Z" } });
    expect(await analyticalLevelSuggestion("guided")).toBeNull();
  });
});
