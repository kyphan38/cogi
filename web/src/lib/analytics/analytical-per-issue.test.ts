import { describe, expect, it } from "vitest";
import { scoreEmbeddedIssueCatch } from "./analytical-per-issue";
import type { EmbeddedIssue, UserHighlight } from "@/lib/types/exercise";

const PASSAGE = "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu.";

describe("scoreEmbeddedIssueCatch", () => {
  const issue: EmbeddedIssue = {
    description: "Test issue",
    type: "logical_fallacy",
    severity: "moderate",
    textSegment: "Alpha beta gamma",
    explanation: "",
  };

  it("returns 0 when segment is not found in passage", () => {
    const badIssue = { ...issue, textSegment: "not in the passage at all" };
    expect(scoreEmbeddedIssueCatch(PASSAGE, badIssue, [])).toBe(0);
  });

  it("returns 0 when no highlights overlap the issue", () => {
    const h: UserHighlight = {
      id: "h1", startOffset: 50, endOffset: 60, text: "kappa lambda", tag: "logical_fallacy",
    };
    expect(scoreEmbeddedIssueCatch(PASSAGE, issue, [h])).toBe(0);
  });

  it("returns 100 for perfect span + tag match", () => {
    const start = PASSAGE.indexOf("Alpha beta gamma");
    const h: UserHighlight = {
      id: "h1",
      startOffset: start,
      endOffset: start + "Alpha beta gamma".length,
      text: "Alpha beta gamma",
      tag: "logical_fallacy",
    };
    expect(scoreEmbeddedIssueCatch(PASSAGE, issue, [h])).toBe(100);
  });

  it("gives partial credit for span match with wrong tag", () => {
    const start = PASSAGE.indexOf("Alpha beta gamma");
    const h: UserHighlight = {
      id: "h1",
      startOffset: start,
      endOffset: start + "Alpha beta gamma".length,
      text: "Alpha beta gamma",
      tag: "bias",
    };
    const score = scoreEmbeddedIssueCatch(PASSAGE, issue, [h]);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThan(100);
  });

  it("picks the best overlapping highlight", () => {
    const start = PASSAGE.indexOf("Alpha beta gamma");
    const h1: UserHighlight = {
      id: "h1", startOffset: start, endOffset: start + 5, text: "Alpha", tag: "logical_fallacy",
    };
    const h2: UserHighlight = {
      id: "h2",
      startOffset: start,
      endOffset: start + "Alpha beta gamma".length,
      text: "Alpha beta gamma",
      tag: "logical_fallacy",
    };
    const score = scoreEmbeddedIssueCatch(PASSAGE, issue, [h1, h2]);
    expect(score).toBe(100);
  });
});
