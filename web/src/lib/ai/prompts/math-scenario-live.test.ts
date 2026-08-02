import { describe, expect, it } from "vitest";
import { buildLiveScenarioDraftPrompt } from "./math-scenario-live";

describe("buildLiveScenarioDraftPrompt", () => {
  it("interpolates the topic and title into the intro and JSON shape", () => {
    const prompt = buildLiveScenarioDraftPrompt({
      topic: "expected_value",
      title: "Should you buy the extended warranty?",
    });

    expect(prompt).toContain('Topic area: "expected_value"');
    expect(prompt).toContain('Title: "Should you buy the extended warranty?"');
    expect(prompt).toContain('"topic": "expected_value"');
    expect(prompt).toContain('"title": "Should you buy the extended warranty?"');
  });

  it("includes the neutral-label, derivation, self-contained, and correctness-gate rules", () => {
    const prompt = buildLiveScenarioDraftPrompt({ topic: "game_theory", title: "Any title" });

    expect(prompt).toContain("NEUTRAL OPTION LABELS");
    expect(prompt).toContain("ANSWER MUST BE DERIVED, NOT ASSERTED");
    expect(prompt).toContain("SELF-CONTAINED");
    expect(prompt).toContain("commitSpec CORRECTNESS GATE");
  });

  it("does not request an id field (server-assigned) or a notes field (authoring-only)", () => {
    const prompt = buildLiveScenarioDraftPrompt({ topic: "game_theory", title: "Any title" });

    expect(prompt).toContain('Do not include "id"');
    expect(prompt).not.toContain('"id": "kebab-case-unique-id"');
    expect(prompt).not.toContain('"notes"');
  });

  it("requests strict JSON with no markdown fences", () => {
    const prompt = buildLiveScenarioDraftPrompt({ topic: "game_theory", title: "Any title" });

    expect(prompt).toContain("no markdown fences, no prose");
  });
});
