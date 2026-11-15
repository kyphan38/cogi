import { describe, expect, it } from "vitest";
import type { LearnedTerm } from "@/lib/exercise/terms";
import { ankiFileName, boldTerm, termsToAnkiText } from "@/lib/exercise/terms-export";

const term = (over: Partial<LearnedTerm>): LearnedTerm => ({
  key: "saving face",
  term: "Saving face",
  plain: "Keeping respect in front of people.",
  example: "She talked in private, so he could keep saving face.",
  seenIn: [{ id: "1", title: "A late report", type: "judgment" }],
  firstSeen: "2026-11-01T09:00:00Z",
  ...over,
});

describe("boldTerm", () => {
  it("bolds the first use, keeping its case", () => {
    expect(boldTerm("Saving face matters. Saving face again.", "saving face")).toBe("**Saving face** matters. Saving face again.");
  });
  it("leaves the example alone when the term is missing", () => {
    expect(boldTerm("No match here.", "base rate")).toBe("No match here.");
  });
  it("treats regex characters as text", () => {
    expect(boldTerm("Cost (a+b) rises.", "(a+b)")).toBe("Cost **(a+b)** rises.");
  });
});

describe("termsToAnkiText", () => {
  it("writes header, bold example, meaning and titles, one card per block", () => {
    const text = termsToAnkiText([
      term({}),
      term({ key: "base rate", term: "Base rate", plain: "How common it is.", example: "Check the base rate.", seenIn: [] }),
    ]);
    expect(text).toBe(
      [
        "1. Saving face",
        "She talked in private, so he could keep **saving face**.",
        "[Concept] Keeping respect in front of people.",
        "Seen in: A late report",
        "",
        "2. Base rate",
        "Check the **base rate**.",
        "[Concept] How common it is.",
        "",
      ].join("\n"),
    );
  });

  it("never writes a blank line inside a card", () => {
    const text = termsToAnkiText([term({ plain: "Line one.\n\nLine two.", example: "  \n " })]);
    const cards = text.trim().split(/\n\s*\n/);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.split("\n")).toEqual(["1. Saving face", "**Saving face**", "[Concept] Line one. Line two.", "Seen in: A late report"]);
  });

  it("lists at most 3 exercise titles", () => {
    const seenIn = ["a", "b", "c", "d"].map((t, i) => ({ id: String(i), title: t, type: "judgment" as const }));
    expect(termsToAnkiText([term({ seenIn })])).toContain("Seen in: a, b, c\n");
  });

  it("names the file by day", () => {
    expect(ankiFileName("2026-11-15")).toBe("cogi-terms-2026-11-15.txt");
  });
});
