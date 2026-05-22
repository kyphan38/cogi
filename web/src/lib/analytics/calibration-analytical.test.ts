import { describe, expect, it } from "vitest";
import { computeAnalyticalAccuracy } from "./calibration-analytical";
import type { EmbeddedIssue, UserHighlight } from "@/lib/types/exercise";

const PASSAGE =
  "Tariffs will stabilize supply chains and protect domestic manufacturing. " +
  "Critics argue prices rise, but supporters believe long-term benefits outweigh costs. " +
  "Recent data shows a 15% increase in local production.";

function makeIssue(overrides: Partial<EmbeddedIssue> = {}): EmbeddedIssue {
  return {
    description: "Test issue",
    type: "logical_fallacy",
    severity: "moderate",
    textSegment: "Tariffs will stabilize supply chains",
    explanation: "Assumes direct causal link.",
    ...overrides,
  };
}

function makeHighlight(overrides: Partial<UserHighlight> = {}): UserHighlight {
  return {
    id: "h1",
    startOffset: 0,
    endOffset: 36,
    text: "Tariffs will stabilize supply chains",
    tag: "logical_fallacy",
    ...overrides,
  };
}

describe("computeAnalyticalAccuracy", () => {
  it("returns 0 when there are no embedded issues", () => {
    expect(computeAnalyticalAccuracy(PASSAGE, [], [], [])).toBe(0);
  });

  it("returns 100 for perfect span + tag match", () => {
    const issue = makeIssue();
    const highlight = makeHighlight();
    const score = computeAnalyticalAccuracy(PASSAGE, [issue], [], [highlight]);
    expect(score).toBe(100);
  });

  it("penalises tag mismatch with partial credit", () => {
    const issue = makeIssue({ type: "hidden_assumption" });
    const highlight = makeHighlight({ tag: "logical_fallacy" });
    const score = computeAnalyticalAccuracy(PASSAGE, [issue], [], [highlight]);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });

  it("gives 0 when no highlights overlap any issue", () => {
    const issue = makeIssue();
    const highlight = makeHighlight({ startOffset: 200, endOffset: 250, text: "unrelated" });
    const score = computeAnalyticalAccuracy(PASSAGE, [issue], [], [highlight]);
    expect(score).toBe(0);
  });

  it("gives small bonus for valid_point highlight on decoy span", () => {
    const issue = makeIssue();
    const highlight = makeHighlight();
    const decoySegment = "15% increase in local production";
    const decoyStart = PASSAGE.indexOf(decoySegment);
    const vpHighlight: UserHighlight = {
      id: "h2",
      startOffset: decoyStart,
      endOffset: decoyStart + decoySegment.length,
      text: decoySegment,
      tag: "valid_point",
    };
    const withoutVP = computeAnalyticalAccuracy(
      PASSAGE, [issue], [{ textSegment: decoySegment }], [highlight],
    );
    const withVP = computeAnalyticalAccuracy(
      PASSAGE, [issue], [{ textSegment: decoySegment }], [highlight, vpHighlight],
    );
    expect(withVP).toBeGreaterThanOrEqual(withoutVP);
  });

  it("averages across multiple embedded issues", () => {
    const issue1 = makeIssue();
    const issue2 = makeIssue({
      textSegment: "15% increase in local production",
      type: "weak_evidence",
    });
    const seg2 = "15% increase in local production";
    const s2 = PASSAGE.indexOf(seg2);
    const h1 = makeHighlight();
    const h2 = makeHighlight({
      id: "h2", startOffset: s2, endOffset: s2 + seg2.length, text: seg2, tag: "weak_evidence",
    });
    const perfectBoth = computeAnalyticalAccuracy(PASSAGE, [issue1, issue2], [], [h1, h2]);
    const perfectOne = computeAnalyticalAccuracy(PASSAGE, [issue1, issue2], [], [h1]);
    expect(perfectBoth).toBeGreaterThan(perfectOne);
  });

  describe("sound reasoning mode", () => {
    it("returns 100 when no flaw tags are used", () => {
      const highlights: UserHighlight[] = [
        makeHighlight({ tag: "valid_point" }),
      ];
      expect(computeAnalyticalAccuracy(PASSAGE, [], [], highlights, true)).toBe(100);
    });

    it("penalises each false flaw tag by 12 points", () => {
      const highlights: UserHighlight[] = [
        makeHighlight({ tag: "logical_fallacy" }),
        makeHighlight({ id: "h2", tag: "bias", startOffset: 50, endOffset: 80, text: "x" }),
      ];
      expect(computeAnalyticalAccuracy(PASSAGE, [], [], highlights, true)).toBe(76);
    });

    it("clamps at 0 for many false flaw tags", () => {
      const highlights: UserHighlight[] = Array.from({ length: 12 }, (_, i) => ({
        id: `h${i}`,
        startOffset: 0,
        endOffset: 10,
        text: "x",
        tag: "logical_fallacy" as const,
      }));
      expect(computeAnalyticalAccuracy(PASSAGE, [], [], highlights, true)).toBe(0);
    });
  });
});
