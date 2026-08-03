import { describe, expect, it } from "vitest";
import { buildComboGenerationPrompt } from "./combo";

describe("buildComboGenerationPrompt", () => {
  it("builds full_analysis preset with correct keys", () => {
    const result = buildComboGenerationPrompt({ preset: "full_analysis", domain: "tech" });
    expect(result).toContain("full_analysis");
    expect(result).toContain("analytical");
    expect(result).toContain("systems");
    expect(result).toContain("evaluativeMatrix");
    expect(result).toContain("sharedScenario");
  });

  it("builds decision_sprint preset", () => {
    const result = buildComboGenerationPrompt({ preset: "decision_sprint", domain: "finance" });
    expect(result).toContain("decision_sprint");
    expect(result).toContain("evaluativeMatrix");
    expect(result).toContain("generative");
    expect(result).not.toContain("analytical:");
  });

  it("builds root_cause preset", () => {
    const result = buildComboGenerationPrompt({ preset: "root_cause", domain: "ops" });
    expect(result).toContain("root_cause");
    expect(result).toContain("sequential");
    expect(result).toContain("systems");
    expect(result).toContain("analytical");
  });

  it("includes domain in output", () => {
    const result = buildComboGenerationPrompt({ preset: "full_analysis", domain: "healthcare" });
    expect(result).toContain("healthcare");
  });

  it("includes userContext when provided", () => {
    const result = buildComboGenerationPrompt({
      preset: "full_analysis",
      domain: "tech",
      userContext: "senior engineer",
    });
    expect(result).toContain("senior engineer");
  });

  it("includes customScenario when provided", () => {
    const result = buildComboGenerationPrompt({
      preset: "decision_sprint",
      domain: "tech",
      customScenario: "Cloud migration decision",
    });
    expect(result).toContain("Cloud migration decision");
  });

  it("includes JSON rules about node count for full_analysis", () => {
    const result = buildComboGenerationPrompt({ preset: "full_analysis", domain: "tech" });
    expect(result).toContain("node_1");
  });

  it("includes prompt count rule for decision_sprint (generative sub-exercise)", () => {
    const result = buildComboGenerationPrompt({ preset: "decision_sprint", domain: "tech" });
    expect(result).toContain("4 prompts");
  });

  it("does not leak undefined or [object Object]", () => {
    const result = buildComboGenerationPrompt({ preset: "full_analysis", domain: "test" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });

  describe("geopolitics domain auto-detection (§2a)", () => {
    it("full_analysis requests geopolitics analytical + systems shapes for a geopolitics domain", () => {
      const result = buildComboGenerationPrompt({
        preset: "full_analysis",
        domain: "US-China strategic competition",
      });
      expect(result).toContain("hiddenPerspective");
      expect(result).toContain("missingActors");
      expect(result).toContain("perspectiveAName");
      expect(result).toContain("shockEventB");
    });

    it("full_analysis stays on the base shapes for a non-geopolitics domain", () => {
      const result = buildComboGenerationPrompt({ preset: "full_analysis", domain: "cooking" });
      expect(result).not.toContain("hiddenPerspective");
      expect(result).not.toContain("perspectiveAName");
    });

    it("root_cause requests geopolitics sequential + systems + analytical shapes for a geopolitics domain", () => {
      const result = buildComboGenerationPrompt({
        preset: "root_cause",
        domain: "NATO expansion",
      });
      expect(result).toContain("correctPositionB");
      expect(result).toContain("criticalErrorsB");
      expect(result).toContain("shockEventB");
      expect(result).toContain("hiddenPerspective");
      expect(result).toContain("highlight_tag");
    });

    it("root_cause stays on the base shapes for a non-geopolitics domain", () => {
      const result = buildComboGenerationPrompt({ preset: "root_cause", domain: "gardening" });
      expect(result).not.toContain("correctPositionB");
      expect(result).not.toContain("hiddenPerspective");
    });
  });

  describe("decision_sprint generativeVariant (§2a)", () => {
    it("defaults to argue_debate style requirements", () => {
      const result = buildComboGenerationPrompt({ preset: "decision_sprint", domain: "tech" });
      expect(result).toContain("core problem, alternatives");
    });

    it("requests reframing-specific requirements when generativeVariant is reframing", () => {
      const result = buildComboGenerationPrompt({
        preset: "decision_sprint",
        domain: "tech",
        generativeVariant: "reframing",
      });
      expect(result).toContain("reframing techniques");
      expect(result).toContain("naive");
    });

    it("requests inversion-specific requirements when generativeVariant is inversion", () => {
      const result = buildComboGenerationPrompt({
        preset: "decision_sprint",
        domain: "tech",
        generativeVariant: "inversion",
      });
      expect(result).toContain("failure path");
      expect(result).toContain("preventive action");
    });
  });

  describe("crisis_response preset", () => {
    it("requests all required top-level keys", () => {
      const result = buildComboGenerationPrompt({ preset: "crisis_response", domain: "Arctic geopolitics" });
      expect(result).toContain("crisis_response");
      expect(result).toContain("perspectiveAName");
      expect(result).toContain("perspectiveBName");
      expect(result).toContain("sequential");
      expect(result).toContain("systems");
      expect(result).toContain("evaluativeUncertainty");
    });

    it("requires the dual-actor sequential and systems shapes", () => {
      const result = buildComboGenerationPrompt({ preset: "crisis_response", domain: "Sanctions" });
      expect(result).toContain("correctPositionB");
      expect(result).toContain("criticalErrorsB");
      expect(result).toContain("intendedConnectionsB");
      expect(result).toContain("shockEventB");
    });

    it("requires the uncertainty evaluative variant, not matrix or scoring", () => {
      const result = buildComboGenerationPrompt({ preset: "crisis_response", domain: "Sanctions" });
      expect(result).toContain('variant "uncertainty"');
    });

    it("instructs identical actor names across sub-schemas", () => {
      const result = buildComboGenerationPrompt({ preset: "crisis_response", domain: "Sanctions" });
      expect(result).toContain("EXACT SAME two");
    });

    it("does not leak undefined or [object Object]", () => {
      const result = buildComboGenerationPrompt({ preset: "crisis_response", domain: "test" });
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("[object Object]");
    });
  });
});
