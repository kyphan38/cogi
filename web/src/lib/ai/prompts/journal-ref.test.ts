import { describe, expect, it } from "vitest";
import { buildJournalReferencePrompt } from "./journal-ref";

describe("buildJournalReferencePrompt", () => {
  it("includes domain", () => {
    const result = buildJournalReferencePrompt({ domain: "economics", snippets: ["reflection 1"] });
    expect(result).toContain("economics");
  });

  it("includes numbered snippets", () => {
    const result = buildJournalReferencePrompt({
      domain: "tech", snippets: ["First thought", "Second thought"],
    });
    expect(result).toContain("(1) First thought");
    expect(result).toContain("(2) Second thought");
  });

  it("shows fallback when no snippets", () => {
    const result = buildJournalReferencePrompt({ domain: "tech", snippets: [] });
    expect(result).toContain("(no prior journals in this domain)");
  });

  it("truncates long snippets to 500 chars", () => {
    const long = "a".repeat(600);
    const result = buildJournalReferencePrompt({ domain: "x", snippets: [long] });
    expect(result).not.toContain("a".repeat(600));
    expect(result).toContain("a".repeat(500));
  });

  it("mentions SKIP output for empty case", () => {
    const result = buildJournalReferencePrompt({ domain: "x", snippets: [] });
    expect(result).toContain("SKIP");
  });

  it("mentions 220 character limit", () => {
    const result = buildJournalReferencePrompt({ domain: "x", snippets: ["s"] });
    expect(result).toContain("220 characters");
  });
});
