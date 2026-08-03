import { describe, expect, it } from "vitest";
import {
  buildAnalyticalPerspectivePrompt,
  buildAnalyticalSteelmanPerspectivePrompt,
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

describe("buildAnalyticalSteelmanPerspectivePrompt", () => {
  const base = {
    title: "Remote work is bad for productivity",
    passage: "Remote work reduces spontaneous collaboration and weakens team cohesion.",
    steelmanText: "The strongest case for this position rests on measurable declines in cross-team collaboration...",
    confidenceBefore: 55,
    domain: "management",
  };

  it("includes title, position, steelman text, and domain", () => {
    const result = buildAnalyticalSteelmanPerspectivePrompt(base);
    expect(result).toContain("Remote work is bad for productivity");
    expect(result).toContain("Remote work reduces spontaneous collaboration");
    expect(result).toContain("The strongest case for this position rests on measurable declines");
    expect(result).toContain("management");
  });

  it("includes the clarity_v2 output contract", () => {
    const result = buildAnalyticalSteelmanPerspectivePrompt(base);
    expect(result).toContain('"perspectiveFormat": "clarity_v2"');
    expect(result).toContain("highlightCritiques");
    expect(result).toContain("openQuestions");
  });

  it("instructs quoting from the user's steelman, not the original position", () => {
    const result = buildAnalyticalSteelmanPerspectivePrompt(base);
    expect(result).toContain("NOT the position");
  });

  it("interpolates userContext", () => {
    const result = buildAnalyticalSteelmanPerspectivePrompt({ ...base, userContext: "grad student" });
    expect(result).toContain("grad student");
  });

  it("defaults userContext to none", () => {
    const result = buildAnalyticalSteelmanPerspectivePrompt(base);
    expect(result).toContain("(none)");
  });

  it("does not leak undefined or [object Object]", () => {
    const result = buildAnalyticalSteelmanPerspectivePrompt(base);
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});
