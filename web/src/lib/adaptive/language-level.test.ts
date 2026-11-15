import { describe, expect, it } from "vitest";
import { buildLanguageLevelAppendix, LANGUAGE_LEVELS, languageLevelGuidance } from "./language-level";

describe("languageLevelGuidance", () => {
  it("gives the default level a concrete sentence limit and no idioms", () => {
    const g = languageLevelGuidance("Intermediate");
    expect(g).toMatch(/IELTS 6/);
    expect(g).toMatch(/under 20 words/);
    expect(g).toMatch(/No idioms/);
  });

  it("keeps the task, counts and JSON shape at every simplified level", () => {
    for (const level of ["Foundation", "Developing", "Intermediate"] as const) {
      expect(languageLevelGuidance(level)).toMatch(/Do not simplify the reasoning task/);
    }
  });

  it("adds nothing for Native", () => {
    expect(languageLevelGuidance("Native")).toBe("");
    expect(buildLanguageLevelAppendix("Native")).toBeUndefined();
  });

  it("never uses an em dash", () => {
    for (const level of LANGUAGE_LEVELS) expect(languageLevelGuidance(level)).not.toContain(String.fromCharCode(8212));
  });
});
