import { describe, expect, it } from "vitest";
import { handoffFor, OWN_TEXT_MIN_WORDS, scenarioSource, wordCount } from "./scenario-handoff";

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

describe("specific scenario hand-off (decision 9)", () => {
  it("counts words", () => {
    expect(wordCount("  one two\nthree  ")).toBe(3);
  });

  it("lets Analytical read a text of 120+ words as it is, and build around a shorter one", () => {
    expect(OWN_TEXT_MIN_WORDS).toBe(120);
    expect(scenarioSource("analytical", words(120))).toBe("real_data");
    expect(scenarioSource("analytical", words(119))).toBe("custom_scenario");
    expect(handoffFor("analytical", words(130))).toEqual({ source: "real_data", realDataText: words(130) });
  });

  it("builds around the text in every other mode, whatever its length", () => {
    for (const m of ["systems", "evaluative", "judgment", "reframe"] as const) {
      expect(scenarioSource(m, words(300)), m).toBe("custom_scenario");
    }
    expect(handoffFor("judgment", "  My story.  ")).toEqual({ source: "custom_scenario", customScenarioText: "My story." });
  });
});
