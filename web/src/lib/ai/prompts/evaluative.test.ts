import { describe, expect, it } from "vitest";
import {
  buildEvaluativeGenerationPrompt,
  buildGeopoliticsEvaluativePrompt,
  buildEvaluativeDealbreakerPrompt,
  buildEvaluativeUncertaintyPrompt,
} from "./evaluative";

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

describe("buildEvaluativeDealbreakerPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "vendor selection" });
    expect(result).toContain("vendor selection");
    expect(result.length).toBeGreaterThan(100);
  });

  it("forces scoring-only variant", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "tech" });
    expect(result).toContain('"variant": "scoring"');
    expect(result).toContain("do not return matrix");
  });

  it("includes isDealbreaker and hiddenCriteria fields", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "tech" });
    expect(result).toContain("isDealbreaker");
    expect(result).toContain("hiddenCriteria");
    expect(result).toContain("suggestedScores");
  });

  it("describes non-compensatory hard-constraint semantics", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "tech" });
    expect(result).toContain("non-compensatory");
    expect(result).toContain("deal-breaker");
  });

  it("interpolates userContext", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "tech", userContext: "PM lead" });
    expect(result).toContain("PM lead");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "tech", adaptationAppendix: "Advanced tier" });
    expect(result).toContain("Advanced tier");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "tech", customScenario: "Vendor RFP" });
    expect(result).toContain("Vendor RFP");
  });

  it("does not leak undefined", () => {
    const result = buildEvaluativeDealbreakerPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});

describe("buildEvaluativeUncertaintyPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "startup fundraising" });
    expect(result).toContain("startup fundraising");
    expect(result.length).toBeGreaterThan(100);
  });

  it("forces uncertainty variant", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "tech" });
    expect(result).toContain('"variant": "uncertainty"');
  });

  it("includes outcomes with probability and payoff fields", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "tech" });
    expect(result).toContain("outcomes");
    expect(result).toContain("probability");
    expect(result).toContain("payoff");
  });

  it("requires probabilities to sum to 1.0 and consistent payoff units", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "tech" });
    expect(result).toContain("sum to 1.0");
    expect(result).toContain("consistent");
  });

  it("interpolates userContext", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "tech", userContext: "PM lead" });
    expect(result).toContain("PM lead");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "tech", adaptationAppendix: "Advanced tier" });
    expect(result).toContain("Advanced tier");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "tech", customScenario: "Series A decision" });
    expect(result).toContain("Series A decision");
  });

  it("does not leak undefined", () => {
    const result = buildEvaluativeUncertaintyPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});
