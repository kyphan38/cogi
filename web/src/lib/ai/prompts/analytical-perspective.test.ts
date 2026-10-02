import { describe, expect, it } from "vitest";
import {
  buildAnalyticalPerspectivePrompt,
} from "./analytical-perspective";

describe("buildAnalyticalPerspectivePrompt", () => {
  const base = {
    title: "Market Analysis",
    passage: "The company shows strong evidence of growth.",
    embeddedIssues: [],
    validPoints: [],
    userHighlights: [],
    confidenceBefore: 60,
    domain: "economics",
  };

  it("includes title, passage, and domain", () => {
    const result = buildAnalyticalPerspectivePrompt(base);
    expect(result).toContain("Market Analysis");
    expect(result).toContain("The company shows strong evidence of growth.");
    expect(result).toContain("economics");
  });

  it("includes the clarity_v2 output contract", () => {
    const result = buildAnalyticalPerspectivePrompt(base);
    expect(result).toContain('"perspectiveFormat": "clarity_v2"');
    expect(result).toContain("highlightCritiques");
    expect(result).toContain("openQuestions");
  });

  it("includes geopolitics meta-analysis block when hiddenPerspective is set", () => {
    const result = buildAnalyticalPerspectivePrompt({
      ...base,
      hiddenPerspective: "US-aligned think tank",
      missingActors: ["Russia"],
    });
    expect(result).toContain("Geopolitics meta-analysis");
    expect(result).toContain("US-aligned think tank");
  });

  it("omits geopolitics block when hiddenPerspective absent", () => {
    const result = buildAnalyticalPerspectivePrompt(base);
    expect(result).not.toContain("Geopolitics meta-analysis");
  });
});

