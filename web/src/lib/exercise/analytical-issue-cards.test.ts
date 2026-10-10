import { describe, expect, it } from "vitest";
import { ANALYTICAL_ISSUE_GUIDE } from "./analytical-issue-guide";
import { pickIssueCards } from "./analytical-issue-cards";
import type { AnalyticalResult, EmbeddedIssue } from "@/lib/types/exercise";

const issues: Pick<EmbeddedIssue, "type">[] = [
  { type: "weak_evidence" },
  { type: "hidden_assumption" },
  { type: "logical_fallacy" },
  { type: "bias" },
];

const outcome = (index: number, o: Partial<AnalyticalResult["issues"][number]> = {}) => ({
  index,
  type: issues[index]!.type,
  severity: "moderate" as const,
  highlightId: null,
  userTag: null,
  found: true,
  tagCorrect: true,
  ...o,
});

describe("analytical issue guide", () => {
  it("covers the 8 issue types and sound reasoning, with every field filled", () => {
    const keys = Object.keys(ANALYTICAL_ISSUE_GUIDE);
    expect(keys).toHaveLength(9);
    for (const k of keys) {
      const g = ANALYTICAL_ISSUE_GUIDE[k as keyof typeof ANALYTICAL_ISSUE_GUIDE];
      for (const v of [g.spot, g.ask, g.fix, g.othersTip, g.practice]) expect(v.trim().length, k).toBeGreaterThan(10);
      expect(g.signals.length, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pickIssueCards", () => {
  it("all found: the first two planned types", () => {
    const r = { total: 4, issues: [0, 1, 2, 3].map((i) => outcome(i)), decoys: [] };
    expect(pickIssueCards(issues, r)).toEqual(["weak_evidence", "hidden_assumption"]);
  });

  it("missed first, then another tag, then the tag put on a sound statement", () => {
    const r = {
      total: 4,
      issues: [outcome(0), outcome(1, { found: false, tagCorrect: false }), outcome(2, { tagCorrect: false, userTag: "bias" }), outcome(3)],
      decoys: [{ index: 0, highlightId: "h", userTag: "weak_evidence" as const, trapped: true }],
    };
    expect(pickIssueCards(issues, r)).toEqual(["hidden_assumption", "logical_fallacy"]);
    const onlyTrap = { ...r, issues: [0, 1, 2, 3].map((i) => outcome(i)) };
    expect(pickIssueCards(issues, onlyTrap)).toEqual(["weak_evidence", "hidden_assumption"]);
  });

  it("a sound passage starts with Sound reasoning, then the over-used tag", () => {
    const r = { total: 0, issues: [], decoys: [{ index: 0, highlightId: "h", userTag: "bias" as const, trapped: true }] };
    expect(pickIssueCards([], r)).toEqual(["sound_reasoning", "bias"]);
    expect(pickIssueCards([], { ...r, decoys: [] })).toEqual(["sound_reasoning"]);
  });
});
