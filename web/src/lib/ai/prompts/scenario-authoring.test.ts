import { describe, expect, it } from "vitest";
import { buildScenarioAuthoringPrompt } from "./scenario-authoring";

describe("buildScenarioAuthoringPrompt", () => {
  it("renders '(none yet)' when there are no existing reasoning moves", () => {
    const prompt = buildScenarioAuthoringPrompt([]);

    expect(prompt).toContain("(none yet)");
  });

  it("numbers and formats each existing reasoning move", () => {
    const prompt = buildScenarioAuthoringPrompt([
      { toolName: "Expected Value", topic: "expected_value", reasoningMove: "probability-weighted payoff" },
      { toolName: "Bayes Update", topic: "probability_bayes", reasoningMove: "base-rate correction" },
    ]);

    expect(prompt).toContain('1. [expected_value] "Expected Value" - probability-weighted payoff');
    expect(prompt).toContain('2. [probability_bayes] "Bayes Update" - base-rate correction');
  });

  it("includes the anti-clone, neutral-label, derivation, self-contained, and correctness-gate rules", () => {
    const prompt = buildScenarioAuthoringPrompt([]);

    expect(prompt).toContain("ANTI-CLONE");
    expect(prompt).toContain("NEUTRAL OPTION LABELS");
    expect(prompt).toContain("ANSWER MUST BE DERIVED, NOT ASSERTED");
    expect(prompt).toContain("SELF-CONTAINED");
    expect(prompt).toContain("commitSpec CORRECTNESS GATE");
  });

  it("requests strict JSON including id and a reviewer-only notes field", () => {
    const prompt = buildScenarioAuthoringPrompt([]);

    expect(prompt).toContain('"id": "kebab-case-unique-id"');
    expect(prompt).toContain('"notes"');
    expect(prompt).toContain("no markdown fences, no prose");
  });
});
