import { describe, expect, it } from "vitest";
import { buildEvaluativeGenerationPrompt, buildGeopoliticsEvaluativePrompt } from "./evaluative";

describe("buildEvaluativeGenerationPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "product strategy" });
    expect(result).toContain("product strategy");
    expect(result.length).toBeGreaterThan(100);
  });

  it("includes both matrix and scoring variant shapes", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "tech" });
    expect(result).toContain('"matrix"');
    expect(result).toContain('"scoring"');
    expect(result).toContain("axisX");
    expect(result).toContain("axisY");
    expect(result).toContain("criteria");
    expect(result).toContain("suggestedScores");
  });

  it("includes intendedQuadrant for matrix", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "tech" });
    expect(result).toContain("intendedQuadrant");
  });

  it("includes hiddenCriteria for scoring", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "tech" });
    expect(result).toContain("hiddenCriteria");
  });

  it("interpolates userContext", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "tech", userContext: "PM lead" });
    expect(result).toContain("PM lead");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "tech", adaptationAppendix: "Advanced tier" });
    expect(result).toContain("Advanced tier");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "tech", customScenario: "Vendor selection" });
    expect(result).toContain("Vendor selection");
  });

  it("does not leak undefined", () => {
    const result = buildEvaluativeGenerationPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});

describe("buildGeopoliticsEvaluativePrompt", () => {
  it("includes geopolitics-specific requirements", () => {
    const result = buildGeopoliticsEvaluativePrompt({ domain: "NATO expansion" });
    expect(result).toContain("scoring");
    expect(result).toContain("STAKEHOLDER");
    expect(result).toContain("stakeholderNote");
    expect(result).toContain("hiddenCriteria");
  });

  it("enforces scoring-only variant", () => {
    const result = buildGeopoliticsEvaluativePrompt({ domain: "trade" });
    expect(result).toContain("do not return matrix");
  });

  it("includes domain", () => {
    const result = buildGeopoliticsEvaluativePrompt({ domain: "South China Sea" });
    expect(result).toContain("South China Sea");
  });

  it("includes adaptation appendix", () => {
    const result = buildGeopoliticsEvaluativePrompt({ domain: "trade", adaptationAppendix: "Expert band" });
    expect(result).toContain("Expert band");
  });

  it("includes scenario block", () => {
    const result = buildGeopoliticsEvaluativePrompt({ domain: "trade", customScenario: "Sanctions debate" });
    expect(result).toContain("Sanctions debate");
  });
});
