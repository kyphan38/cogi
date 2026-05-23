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

  it("includes JSON rules about node count and prompt count", () => {
    const result = buildComboGenerationPrompt({ preset: "full_analysis", domain: "tech" });
    expect(result).toContain("node_1");
    expect(result).toContain("4 prompts");
  });

  it("does not leak undefined or [object Object]", () => {
    const result = buildComboGenerationPrompt({ preset: "full_analysis", domain: "test" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});
