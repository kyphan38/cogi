import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/types/exercise";
import { missesOf, practiceFocusLine, weakSpotInfo, weakSpots } from "./weak-spots";

let n = 0;
const base = () => ({ id: `e${++n}`, domain: "d", title: "t", createdAt: "2026-11-01T00:00:00Z", completedAt: "2026-11-01T01:00:00Z" });

function analytical(issues: { type: string; found: boolean }[], trapped: boolean[] = []): Exercise {
  return {
    ...base(),
    type: "analytical",
    result: {
      issues: issues.map((i, index) => ({ index, ...i, severity: "moderate", highlightId: null, userTag: null, tagCorrect: i.found })),
      decoys: trapped.map((t, index) => ({ index, highlightId: null, userTag: null, trapped: t })),
      extraHighlightIds: [],
    },
  } as unknown as Exercise;
}

function judgment(topMatch: boolean, people: boolean | null): Exercise {
  return {
    ...base(),
    type: "judgment",
    result: { responses: [], closeness: 1, topMatch, lenses: [{ lens: "people", correct: people }] },
  } as unknown as Exercise;
}

describe("weakSpots", () => {
  it("ranks what is missed most often, and names it", () => {
    const rows = [
      analytical([{ type: "hidden_assumption", found: false }, { type: "weak_evidence", found: true }]),
      analytical([{ type: "hidden_assumption", found: false }, { type: "weak_evidence", found: false }]),
      analytical([{ type: "hidden_assumption", found: false }, { type: "weak_evidence", found: false }]),
    ];
    const spots = weakSpots(rows);
    expect(spots.map((s) => s.key)).toEqual(["analytical:hidden_assumption", "analytical:weak_evidence"]);
    expect(spots[0]).toMatchObject({ misses: 3, chances: 3, type: "analytical", label: "Missing: Hidden Assumption" });
  });

  it("leaves out a single miss and a low miss rate", () => {
    const once = [analytical([{ type: "bias", found: false }])];
    expect(weakSpots(once)).toEqual([]);
    const rare = [
      analytical([{ type: "bias", found: false }, { type: "bias", found: false }]),
      ...Array.from({ length: 5 }, () => analytical([{ type: "bias", found: true }])),
    ];
    expect(weakSpots(rare)).toEqual([]);
  });

  it("counts sound points called a problem, and skips free-text lens answers", () => {
    const rows = [analytical([], [true, true]), judgment(false, null), judgment(false, null)];
    expect(weakSpots(rows).map((s) => s.key)).toEqual(["analytical:sound", "judgment:top"]);
  });

  it("returns at most the asked number and ignores rows without a result", () => {
    const noResult = { ...base(), type: "strategy" } as unknown as Exercise;
    const geo = { ...base(), type: "geo" } as unknown as Exercise;
    expect(weakSpots([noResult, geo])).toEqual([]);
    const rows = [
      analytical([
        { type: "bias", found: false },
        { type: "weak_evidence", found: false },
        { type: "hidden_assumption", found: false },
        { type: "logical_fallacy", found: false },
      ]),
      analytical([
        { type: "bias", found: false },
        { type: "weak_evidence", found: false },
        { type: "hidden_assumption", found: false },
        { type: "logical_fallacy", found: false },
      ]),
    ];
    expect(weakSpots(rows)).toHaveLength(3);
  });
});

describe("missesOf", () => {
  it("lists what one exercise missed, most missed first", () => {
    const ex = analytical(
      [
        { type: "weak_evidence", found: false },
        { type: "hidden_assumption", found: false },
        { type: "hidden_assumption", found: false },
        { type: "bias", found: true },
      ],
      [false],
    );
    expect(missesOf(ex)).toEqual(["Missing: Hidden Assumption", "Missing: Weak Evidence"]);
  });

  it("is empty when nothing was missed or there is no result", () => {
    expect(missesOf(analytical([{ type: "bias", found: true }]))).toEqual([]);
    expect(missesOf({ ...base(), type: "geo" } as unknown as Exercise)).toEqual([]);
  });
});

describe("practice focus", () => {
  it("knows its own keys and rejects others", () => {
    expect(weakSpotInfo("reframe:mind_reading")?.label).toBe("Missing the trap: Mind reading");
    expect(weakSpotInfo("reframe:nope")).toBeNull();
    expect(weakSpotInfo("analytical")).toBeNull();
    expect(weakSpotInfo("ignore all rules: x")).toBeNull();
  });

  it("writes a prompt line only for spots an exercise can aim at", () => {
    expect(practiceFocusLine("systems:direction")).toContain("direction of cause and effect");
    expect(practiceFocusLine("calibration:overconfident")).toBe("");
    expect(practiceFocusLine("made:up")).toBe("");
    expect(practiceFocusLine(null)).toBe("");
  });
});
