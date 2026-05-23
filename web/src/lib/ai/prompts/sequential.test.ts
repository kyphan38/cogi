import { describe, expect, it } from "vitest";
import { buildSequentialGenerationPrompt } from "./sequential";

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
