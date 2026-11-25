import { describe, expect, it } from "vitest";
import type { AnalyticalExerciseRow, CalibrationExerciseRow, JudgmentExerciseRow, StrategyExerciseRow } from "@/lib/types/exercise";
import { canRedo, redoForTrack, redoRow, redoSuggestion } from "./redo";
import { compareTries, scoreSummary } from "./score-summary";

const NOW = "2026-11-16T08:00:00.000Z";

const analytical = {
  id: "a1",
  type: "analytical",
  domain: "Work",
  title: "A memo",
  passage: "Sales fell. So the new logo failed.",
  embeddedIssues: [{ description: "d", type: "assumed_causation", severity: "obvious", textSegment: "So the new logo failed.", explanation: "e" }],
  validPoints: [],
  userHighlights: [{ id: "h1", startOffset: 12, endOffset: 35, text: "So the new logo failed.", tag: "assumed_causation" }],
  result: { issues: [], decoys: [], extraHighlightIds: [], found: 1, total: 1, tagsCorrect: 1, trapsHit: 0, decoyTotal: 0 },
  mainClaimAnswer: 2,
  guidedIndex: 3,
  deepDives: { issue_1: {} },
  confidenceBefore: 80,
  aiPerspective: "text",
  aiPerspectiveStructured: {},
  takeaway: "Ask what else changed.",
  usePlan: "Monday review",
  useCheck: { result: "yes", note: "", at: NOW },
  createdAt: "2026-10-01T08:00:00.000Z",
  completedAt: "2026-10-01T09:00:00.000Z",
  currentStep: 7,
} as unknown as AnalyticalExerciseRow;

describe("redoRow", () => {
  it("keeps the content and the answer key, and clears the user's work", () => {
    const r = redoRow(analytical, "a2", NOW) as AnalyticalExerciseRow;
    expect(r).toMatchObject({
      id: "a2",
      redoOf: "a1",
      passage: analytical.passage,
      embeddedIssues: analytical.embeddedIssues,
      userHighlights: [],
      result: null,
      mainClaimAnswer: null,
      guidedIndex: 0,
      confidenceBefore: null,
      aiPerspective: null,
      aiPerspectiveStructured: null,
      takeaway: null,
      usePlan: null,
      useCheck: null,
      createdAt: NOW,
      completedAt: null,
      currentStep: 1,
    });
    expect(r.deepDives).toBeUndefined();
    // A step id from an adaptive track stays with the first try.
    const fromTrack = { ...analytical, trackStepId: "t1-2" } as AnalyticalExerciseRow;
    expect(redoRow(fromTrack, "a3", NOW).trackStepId).toBeUndefined();
    // The first try is not changed.
    expect(analytical.userHighlights).toHaveLength(1);
  });

  it("starts a ranking exercise from a new order with the same items", () => {
    const j = {
      id: "j1", type: "judgment", responses: [{ id: "r1" }, { id: "r2" }, { id: "r3" }], userOrder: ["r1", "r2", "r3"],
      userWhy: "because", lensAnswers: { think: 1 }, part: "respond", completedAt: "2026-10-01T09:00:00.000Z",
    } as unknown as JudgmentExerciseRow;
    const r = redoRow(j, "j2", NOW) as JudgmentExerciseRow;
    expect([...r.userOrder!].sort()).toEqual(["r1", "r2", "r3"]);
    expect(r).toMatchObject({ userWhy: "", lensAnswers: {}, part: "learn" });

    const s = {
      id: "s1", type: "strategy", cells: [{ a: "a1", b: "b1" }, { a: "a1", b: "b2" }, { a: "a2", b: "b1" }, { a: "a2", b: "b2" }],
      answers: { ranks: { A: ["a1|b1", "a1|b2", "a2|b1", "a2|b2"], B: ["a2|b2", "a2|b1", "a1|b2", "a1|b1"] }, prediction: ["a1|b1"], dominant: { A: "a1", B: "none" }, betterForBoth: ["a2|b2"] },
    } as unknown as StrategyExerciseRow;
    const sr = redoRow(s, "s2", NOW) as StrategyExerciseRow;
    expect(sr.answers?.prediction).toEqual([]);
    expect([...sr.answers!.ranks!.A].sort()).toEqual(["a1|b1", "a1|b2", "a2|b1", "a2|b2"]);
    expect(sr.answers?.dominant).toEqual({ A: "", B: "" });

    const guided = { ...s, answers: { bestReplies: { "A:b1": "a1" }, prediction: ["a1|b1"] } } as unknown as StrategyExerciseRow;
    expect((redoRow(guided, "s3", NOW) as StrategyExerciseRow).answers).toEqual({ bestReplies: {}, prediction: [] });
  });
});

describe("canRedo and redoSuggestion", () => {
  const row = (id: string, day: string, redoOf?: string) => ({ id, type: "analytical" as const, completedAt: `${day}T12:00:00`, redoOf });

  it("waits 30 days", () => {
    const ex = row("a", "2026-10-01");
    expect(canRedo(ex, [ex], "2026-10-30")).toBe(false);
    expect(canRedo(ex, [ex], "2026-10-31")).toBe(true);
  });

  it("offers neither a redo itself, nor an exercise already redone or being redone, nor Geo Lab", () => {
    const first = row("a", "2026-09-01");
    const second = row("b", "2026-10-05", "a");
    expect(canRedo(first, [first, second], "2026-11-16")).toBe(false);
    expect(canRedo(second, [first, second], "2026-11-16")).toBe(false);
    const open = { id: "c", type: "analytical" as const, completedAt: null, redoOf: "a" };
    expect(canRedo(first, [first, open], "2026-11-16")).toBe(false);
    expect(canRedo({ id: "g", type: "geo", completedAt: "2026-09-01T12:00:00" }, [], "2026-11-16")).toBe(false);
  });

  it("suggests the oldest one that is ready", () => {
    const rows = [row("new", "2026-11-10"), row("mid", "2026-10-01"), row("old", "2026-09-01")];
    expect(redoSuggestion(rows, rows, "2026-11-16")?.id).toBe("old");
    expect(redoSuggestion([rows[0]!], rows, "2026-11-16")).toBeNull();
  });

  it("for a track, takes the oldest ready one rated poor, of an aimed type", () => {
    const sys = (id: string, day: string) => ({ ...row(id, day), type: "systems" as const });
    const rows = [row("good", "2026-08-01"), row("poor", "2026-09-01"), sys("sysPoor", "2026-07-01"), row("fresh", "2026-11-10")];
    const rate = (r: { id: string }) => (r.id === "good" ? "good" : "poor");
    expect(redoForTrack(rows, rows, "2026-11-16", ["analytical"], rate)?.id).toBe("poor");
    expect(redoForTrack(rows, rows, "2026-11-16", ["systems", "analytical"], rate)?.id).toBe("sysPoor");
    expect(redoForTrack(rows, rows, "2026-11-16", ["judgment"], rate)).toBeNull();
  });
});

describe("scoreSummary and compareTries", () => {
  const calibration = (right: number) =>
    ({
      type: "calibration",
      result: { items: [0, 1, 2, 3].map((i) => ({ id: `q${i}`, kind: "binary", answered: i < 3, correct: i < right })) },
    }) as unknown as CalibrationExerciseRow;

  it("puts a result in one line with a 0..1 score", () => {
    expect(scoreSummary(analytical)).toEqual({ line: "Found 1 of 1 issues", ratio: 1 });
    expect(scoreSummary(calibration(2))).toEqual({ line: "2 of 3 right", ratio: 2 / 3 });
    expect(scoreSummary({ type: "geo" } as never)).toBeNull();
    expect(scoreSummary({ type: "strategy", result: null } as never)).toBeNull();
  });

  it("compares a redo with the first try", () => {
    expect(compareTries(calibration(1), calibration(3))).toBe("better");
    expect(compareTries(calibration(2), calibration(2))).toBe("same");
    expect(compareTries(calibration(3), calibration(1))).toBe("lower");
    expect(compareTries(calibration(3), { type: "strategy", result: null } as never)).toBeNull();
  });
});
