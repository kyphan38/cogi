import { describe, expect, it } from "vitest";
import {
  buildGeopoliticsSequentialPrompt,
  buildSequentialGenerationPrompt,
  buildSequentialTriagePrompt,
} from "./sequential";

describe("buildSequentialGenerationPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildSequentialGenerationPrompt({ domain: "logistics" });
    expect(result).toContain("logistics");
    expect(result.length).toBeGreaterThan(100);
  });

  it("includes JSON schema structure", () => {
    const result = buildSequentialGenerationPrompt({ domain: "tech" });
    expect(result).toContain('"correctPosition"');
    expect(result).toContain('"dependencies"');
    expect(result).toContain('"isFlexible"');
    expect(result).toContain('"criticalErrors"');
  });

  it("specifies 8 steps", () => {
    const result = buildSequentialGenerationPrompt({ domain: "tech" });
    expect(result).toContain("8 steps");
    expect(result).toContain("exactly 8");
  });

  it("interpolates userContext", () => {
    const result = buildSequentialGenerationPrompt({ domain: "tech", userContext: "crisis manager" });
    expect(result).toContain("crisis manager");
  });

  it("defaults userContext to none provided", () => {
    const result = buildSequentialGenerationPrompt({ domain: "tech" });
    expect(result).toContain("(none provided)");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildSequentialGenerationPrompt({ domain: "tech", adaptationAppendix: "Expert level" });
    expect(result).toContain("Expert level");
  });

  it("omits adaptation appendix when not provided", () => {
    const result = buildSequentialGenerationPrompt({ domain: "tech" });
    expect(result).not.toContain("Adaptive guidance");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildSequentialGenerationPrompt({ domain: "tech", customScenario: "Server migration" });
    expect(result).toContain("Server migration");
  });

  it("does not leak undefined", () => {
    const result = buildSequentialGenerationPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
  });
});

describe("buildGeopoliticsSequentialPrompt", () => {
  it("requires perspectiveAName/perspectiveBName and correctPositionB in the schema", () => {
    const result = buildGeopoliticsSequentialPrompt({ domain: "geopolitics" });
    expect(result).toContain('"perspectiveAName"');
    expect(result).toContain('"perspectiveBName"');
    expect(result).toContain('"correctPositionB"');
    expect(result).toContain('"criticalErrorsB"');
  });

  it("interpolates domain and userContext", () => {
    const result = buildGeopoliticsSequentialPrompt({
      domain: "US-China strategic competition",
      userContext: "policy analyst",
    });
    expect(result).toContain("US-China strategic competition");
    expect(result).toContain("policy analyst");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildGeopoliticsSequentialPrompt({
      domain: "geopolitics",
      customScenario: "A border standoff escalates",
    });
    expect(result).toContain("A border standoff escalates");
  });

  it("does not leak undefined", () => {
    const result = buildGeopoliticsSequentialPrompt({ domain: "geopolitics" });
    expect(result).not.toContain("undefined");
  });
});

describe("buildSequentialTriagePrompt", () => {
  it("requires variantKind, timeLimitMinutes, and severity in the schema", () => {
    const result = buildSequentialTriagePrompt({ domain: "incident response" });
    expect(result).toContain('"variantKind": "triage"');
    expect(result).toContain('"timeLimitMinutes"');
    expect(result).toContain('"severity"');
  });

  it("interpolates domain and userContext", () => {
    const result = buildSequentialTriagePrompt({
      domain: "emergency medicine",
      userContext: "ER charge nurse",
    });
    expect(result).toContain("emergency medicine");
    expect(result).toContain("ER charge nurse");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildSequentialTriagePrompt({
      domain: "incident response",
      customScenario: "A datacenter loses power mid-migration",
    });
    expect(result).toContain("A datacenter loses power mid-migration");
  });

  it("does not leak undefined", () => {
    const result = buildSequentialTriagePrompt({ domain: "incident response" });
    expect(result).not.toContain("undefined");
  });
});
