import { describe, expect, it } from "vitest";
import { sentenceRangeAt, splitSentences } from "./sentences";

function texts(passage: string): string[] {
  return splitSentences(passage).map((r) => passage.slice(r.start, r.end));
}

describe("splitSentences", () => {
  it("splits on . ! and ? followed by a new sentence", () => {
    expect(texts("One here. Two there! Three?")).toEqual(["One here.", "Two there!", "Three?"]);
  });

  it("keeps decimals and lower-case abbreviations inside a sentence", () => {
    expect(texts("Start at 5 a.m. to win. Earn 3.5 times more.")).toEqual([
      "Start at 5 a.m. to win.",
      "Earn 3.5 times more.",
    ]);
  });

  it("keeps a closing quote with its sentence", () => {
    expect(texts('He said "go now." Then he left.')).toEqual(['He said "go now."', "Then he left."]);
  });

  it("treats a paragraph break as a sentence end even without a period", () => {
    expect(texts("A heading\n\nBody text here. More text.")).toEqual([
      "A heading",
      "Body text here.",
      "More text.",
    ]);
  });

  it("covers every non-space character exactly once", () => {
    const p = "Alpha 1.5 beta. Gamma!\n\nDelta e.g. epsilon? Zeta";
    const joined = splitSentences(p)
      .map((r) => p.slice(r.start, r.end))
      .join("");
    expect(joined.replace(/\s/g, "")).toBe(p.replace(/\s/g, ""));
  });
});

describe("sentenceRangeAt", () => {
  it("finds the sentence around an index", () => {
    const p = "First one. Second one here. Third.";
    const r = sentenceRangeAt(p, p.indexOf("one here"));
    expect(p.slice(r.start, r.end)).toBe("Second one here.");
  });
});
