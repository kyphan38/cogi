import { describe, expect, it } from "vitest";
import {
  buildAnalyticalGenerationPrompt,
  buildAnalyticalSoundReasoningPrompt,
  buildGeopoliticsAnalyticalPrompt,
  buildAnalyticalFromUserTextPrompt,
  buildGeopoliticsFromUserTextPrompt,
  buildAnalyticalSteelmanPrompt,
} from "./analytical";

describe("buildAnalyticalGenerationPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildAnalyticalGenerationPrompt({ domain: "economics" });
    expect(result).toContain("economics");
    expect(result.length).toBeGreaterThan(100);
  });

  it("includes JSON schema structure", () => {
    const result = buildAnalyticalGenerationPrompt({ domain: "tech" });
    expect(result).toContain('"embeddedIssues"');
    expect(result).toContain('"validPoints"');
    expect(result).toContain('"textSegment"');
  });

  it("interpolates userContext", () => {
    const result = buildAnalyticalGenerationPrompt({ domain: "tech", userContext: "senior analyst" });
    expect(result).toContain("senior analyst");
  });

  it("defaults userContext to none provided", () => {
    const result = buildAnalyticalGenerationPrompt({ domain: "tech" });
    expect(result).toContain("(none provided)");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildAnalyticalGenerationPrompt({ domain: "tech", adaptationAppendix: "Focus on AI risks" });
    expect(result).toContain("Focus on AI risks");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildAnalyticalGenerationPrompt({ domain: "tech", customScenario: "My company merger" });
    expect(result).toContain("My company merger");
    expect(result).toContain("real-world scenario");
  });

  it("does not leak undefined or [object Object]", () => {
    const result = buildAnalyticalGenerationPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});

describe("buildAnalyticalSoundReasoningPrompt", () => {
  it("includes sound reasoning markers", () => {
    const result = buildAnalyticalSoundReasoningPrompt({ domain: "policy" });
    expect(result).toContain("GENUINELY SOUND");
    expect(result).toContain('"isSoundReasoning": true');
    expect(result).toContain('"embeddedIssues": []');
  });

  it("includes domain", () => {
    const result = buildAnalyticalSoundReasoningPrompt({ domain: "healthcare" });
    expect(result).toContain("healthcare");
  });

  it("includes scenario block when provided", () => {
    const result = buildAnalyticalSoundReasoningPrompt({ domain: "finance", customScenario: "Budget review" });
    expect(result).toContain("Budget review");
  });
});

describe("buildGeopoliticsAnalyticalPrompt", () => {
  it("includes geopolitics-specific issue types", () => {
    const result = buildGeopoliticsAnalyticalPrompt({ domain: "US-China relations" });
    expect(result).toContain("framing_bias");
    expect(result).toContain("missing_actor");
    expect(result).toContain("assumed_causation");
    expect(result).toContain("analogy_misuse");
  });

  it("includes hidden perspective and missing actors fields", () => {
    const result = buildGeopoliticsAnalyticalPrompt({ domain: "NATO expansion" });
    expect(result).toContain('"hiddenPerspective"');
    expect(result).toContain('"missingActors"');
  });

  it("includes domain", () => {
    const result = buildGeopoliticsAnalyticalPrompt({ domain: "South China Sea" });
    expect(result).toContain("South China Sea");
  });
});

describe("buildAnalyticalFromUserTextPrompt", () => {
  it("includes user text in the prompt", () => {
    const result = buildAnalyticalFromUserTextPrompt({
      domain: "tech", userText: "The startup raised $10M in funding.",
    });
    expect(result).toContain("The startup raised $10M in funding.");
    expect(result).toContain("USER TEXT");
  });

  it("includes domain", () => {
    const result = buildAnalyticalFromUserTextPrompt({ domain: "energy", userText: "text" });
    expect(result).toContain("energy");
  });
});

describe("buildGeopoliticsFromUserTextPrompt", () => {
  it("includes geopolitics types and user text", () => {
    const result = buildGeopoliticsFromUserTextPrompt({
      domain: "Middle East", userText: "The sanctions affected trade.",
    });
    expect(result).toContain("framing_bias");
    expect(result).toContain("missing_actor");
    expect(result).toContain("The sanctions affected trade.");
    expect(result).toContain('"hiddenPerspective"');
  });
});

describe("buildAnalyticalSteelmanPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "economics" });
    expect(result).toContain("economics");
    expect(result.length).toBeGreaterThan(100);
  });

  it("requires embeddedIssues and validPoints to be empty arrays", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "tech" });
    expect(result).toContain('"embeddedIssues": []');
    expect(result).toContain('"validPoints": []');
    expect(result).toContain("embeddedIssues and validPoints must both be empty arrays");
  });

  it("interpolates userContext", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "tech", userContext: "senior analyst" });
    expect(result).toContain("senior analyst");
  });

  it("defaults userContext to none provided", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "tech" });
    expect(result).toContain("(none provided)");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "tech", adaptationAppendix: "Focus on AI risks" });
    expect(result).toContain("Focus on AI risks");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "tech", customScenario: "My company merger" });
    expect(result).toContain("My company merger");
  });

  it("instructs the model not to pre-steelman the position", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "tech" });
    expect(result).toContain("Do NOT pre-empt counterarguments");
  });

  it("does not leak undefined or [object Object]", () => {
    const result = buildAnalyticalSteelmanPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});
