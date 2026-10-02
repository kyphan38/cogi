import { describe, expect, it } from "vitest";
import type { EmbeddedIssue, UserHighlight, ValidPoint } from "@/lib/types/exercise";
import { scoreAnalytical } from "./analytical-score";
import { calibrationLine, decoyMarker, orderedIssues, passagePieces } from "./answer-key";

const passage = "Alpha is hard. Beta is easy. Gamma is fine.";
const issues: EmbeddedIssue[] = [
  { description: "d", type: "bias", severity: "subtle", textSegment: "Alpha is hard", explanation: "e" },
  { description: "d", type: "weak_evidence", severity: "obvious", textSegment: "Beta is easy", explanation: "e" },
];
const validPoints: ValidPoint[] = [{ textSegment: "Gamma is fine", explanation: "e" }];

describe("orderedIssues", () => {
  it("puts easy issues first and numbers them in that order", () => {
    const result = scoreAnalytical({ passage, embeddedIssues: issues, validPoints, highlights: [] });
    const ordered = orderedIssues(result, issues, passage);
    expect(ordered.map((o) => [o.issue.textSegment, o.marker])).toEqual([
      ["Beta is easy", "1"],
      ["Alpha is hard", "2"],
    ]);
  });
});

describe("passagePieces", () => {
  it("marks issues, decoys and user highlights, with a marker at each end", () => {
    const at = passage.indexOf("is easy");
    const user: UserHighlight = { id: "u", startOffset: at, endOffset: at + 7, text: "is easy", tag: "bias" };
    const result = scoreAnalytical({ passage, embeddedIssues: issues, validPoints, highlights: [user] });
    const pieces = passagePieces({
      passage,
      issues: orderedIssues(result, issues, passage),
      validPoints,
      highlights: [user],
    });
    expect(pieces.map((p) => p.text).join("")).toBe(passage);
    const beta = pieces.filter((p) => p.issue === "1");
    expect(beta.map((p) => p.text).join("")).toBe("Beta is easy");
    expect(beta.find((p) => p.text === "is easy")).toMatchObject({ user: true, markerAfter: "1" });
    expect(pieces.find((p) => p.text === "Gamma is fine")).toMatchObject({ decoy: "A", markerAfter: "A" });
    expect(pieces.find((p) => p.text === "Alpha is hard")).toMatchObject({ issue: "2", user: false });
  });
});

describe("decoyMarker", () => {
  it("uses letters", () => {
    expect([0, 1].map(decoyMarker)).toEqual(["A", "B"]);
  });
});

describe("calibrationLine", () => {
  const result = scoreAnalytical({ passage, embeddedIssues: issues, validPoints, highlights: [] });

  it("compares confidence with the share of issues found", () => {
    expect(calibrationLine(80, { ...result, found: 1 })).toBe(
      "You felt 80% sure and found 50% of the issues. You were more sure than your result - slow down and check each sentence.",
    );
    expect(calibrationLine(20, { ...result, found: 2 })).toContain("You did better than you expected");
    expect(calibrationLine(60, { ...result, found: 1 })).toContain("Your confidence matched your result.");
  });

  it("returns null without a confidence or without planned issues", () => {
    expect(calibrationLine(null, result)).toBeNull();
    expect(calibrationLine(50, { ...result, total: 0 })).toBeNull();
  });
});
