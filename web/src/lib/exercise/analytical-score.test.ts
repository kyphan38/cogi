import { describe, expect, it } from "vitest";
import type { EmbeddedIssue, TagType, UserHighlight, ValidPoint } from "@/lib/types/exercise";
import { scoreAnalytical, sentenceRangeAt } from "./analytical-score";

const passage = [
  "Start each day at 5 a.m. to win. If you do not run at dawn, you will never gain the discipline needed for high pay.",
  "Everyone who earns more than 3.5 times the average wakes early. A study of 12 founders proves the habit works.",
  "Saving 10% of income builds a buffer over time. Our coaching plan is the only sensible choice for ambitious people.",
].join("\n\n");

const issues: EmbeddedIssue[] = [
  { description: "d", type: "logical_fallacy", severity: "obvious", textSegment: "you will never gain the discipline needed for high pay", explanation: "e" },
  { description: "d", type: "hidden_assumption", severity: "moderate", textSegment: "Everyone who earns more than 3.5 times the average wakes early", explanation: "e" },
  { description: "d", type: "weak_evidence", severity: "moderate", textSegment: "A study of 12 founders proves the habit works", explanation: "e" },
  { description: "d", type: "bias", severity: "subtle", textSegment: "Our coaching plan is the only sensible choice", explanation: "e" },
];

const validPoints: ValidPoint[] = [
  { textSegment: "Saving 10% of income builds a buffer over time", explanation: "e" },
  { textSegment: "Start each day at 5 a.m. to win", explanation: "e" },
];

function hl(text: string, tag: TagType, id = text): UserHighlight {
  const start = passage.indexOf(text);
  if (start < 0) throw new Error(`not in passage: ${text}`);
  return { id, startOffset: start, endOffset: start + text.length, text, tag };
}

function score(highlights: UserHighlight[]) {
  return scoreAnalytical({ passage, embeddedIssues: issues, validPoints, highlights });
}

describe("sentenceRangeAt", () => {
  it("stops at a sentence end and at a paragraph break", () => {
    const i = passage.indexOf("discipline");
    const r = sentenceRangeAt(passage, i);
    expect(passage.slice(r.start, r.end)).toBe(
      "If you do not run at dawn, you will never gain the discipline needed for high pay.",
    );
  });

  it("does not split on a decimal number", () => {
    const r = sentenceRangeAt(passage, passage.indexOf("average"));
    expect(passage.slice(r.start, r.end)).toBe(
      "Everyone who earns more than 3.5 times the average wakes early.",
    );
  });
});

describe("scoreAnalytical", () => {
  it("counts an exact highlight with the right tag as found and correctly tagged", () => {
    const r = score([hl("you will never gain the discipline needed for high pay", "logical_fallacy")]);
    expect(r.issues[0]).toMatchObject({ found: true, tagCorrect: true, userTag: "logical_fallacy" });
    expect(r.found).toBe(1);
    expect(r.tagsCorrect).toBe(1);
    expect(r.total).toBe(4);
  });

  it("counts a found issue with the wrong tag as found but not tag-correct", () => {
    const r = score([hl("A study of 12 founders proves the habit works", "bias")]);
    expect(r.issues[2]).toMatchObject({ found: true, tagCorrect: false, userTag: "bias" });
  });

  it("matches the whole sentence around the issue", () => {
    const r = score([
      hl("If you do not run at dawn, you will never gain the discipline needed for high pay.", "logical_fallacy"),
    ]);
    expect(r.issues[0]!.found).toBe(true);
  });

  it("matches a different part of the same sentence", () => {
    const r = score([hl("If you do not run at dawn", "logical_fallacy")]);
    expect(r.issues[0]!.found).toBe(true);
  });

  it("matches a few key words inside the issue", () => {
    const r = score([hl("only sensible choice", "bias")]);
    expect(r.issues[3]!.found).toBe(true);
  });

  it("does not count an issue marked Valid Point or Unclear as found", () => {
    const r = score([
      hl("you will never gain the discipline needed for high pay", "valid_point", "a"),
      hl("A study of 12 founders proves the habit works", "unclear", "b"),
    ]);
    expect(r.issues[0]).toMatchObject({ found: false, highlightId: "a", userTag: "valid_point" });
    expect(r.issues[2]).toMatchObject({ found: false, highlightId: "b", userTag: "unclear" });
    expect(r.found).toBe(0);
    expect(r.extraHighlightIds).toEqual([]);
  });

  it("flags a decoy tagged as a problem as a trap hit", () => {
    const r = score([hl("Saving 10% of income builds a buffer over time", "weak_evidence")]);
    expect(r.decoys[0]).toMatchObject({ trapped: true, userTag: "weak_evidence" });
    expect(r.trapsHit).toBe(1);
  });

  it("does not flag a decoy marked Valid Point", () => {
    const r = score([hl("Saving 10% of income builds a buffer over time", "valid_point")]);
    expect(r.decoys[0]).toMatchObject({ trapped: false, userTag: "valid_point" });
    expect(r.trapsHit).toBe(0);
  });

  it("matches the rest of an issue's sentence, so it is not extra", () => {
    const r = score([hl("for ambitious people", "bias", "x")]);
    expect(r.issues[3]!.highlightId).toBe("x");
    expect(r.extraHighlightIds).toEqual([]);
  });

  it("reports a highlight in an unrelated spot as extra", () => {
    const text = "Saving 10% of income";
    const start = passage.indexOf(text);
    // Shift the range onto the paragraph break, which belongs to no target sentence.
    const h: UserHighlight = { id: "gap", startOffset: start - 2, endOffset: start - 1, text: "\n", tag: "bias" };
    expect(score([h]).extraHighlightIds).toEqual(["gap"]);
  });

  it("prefers a problem-tagged highlight when two cover the same issue", () => {
    const r = score([
      hl("If you do not run at dawn", "valid_point", "fine"),
      hl("you will never gain the discipline", "logical_fallacy", "issue"),
    ]);
    expect(r.issues[0]).toMatchObject({ highlightId: "issue", found: true });
    expect(r.extraHighlightIds).toEqual(["fine"]);
  });

  it("handles a sound-reasoning passage with no issues", () => {
    const r = scoreAnalytical({ passage, embeddedIssues: [], validPoints, highlights: [] });
    expect(r).toMatchObject({ found: 0, total: 0, trapsHit: 0, decoyTotal: 2 });
  });
});
