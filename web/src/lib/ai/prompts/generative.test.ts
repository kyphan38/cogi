import { describe, expect, it } from "vitest";
import {
  buildGenerativeGenerationPrompt,
  buildGeopoliticsGenerativePrompt,
  GEOPOLITICS_GENERATIVE_RETRY_SUFFIX,
} from "./generative";

describe("buildGenerativeGenerationPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildGenerativeGenerationPrompt({
      domain: "climate policy",
      generativeStage: "edit",
    });
    expect(result).toContain("climate policy");
    expect(result.length).toBeGreaterThan(100);
  });

  it("includes edit stage instructions", () => {
    const result = buildGenerativeGenerationPrompt({ domain: "tech", generativeStage: "edit" });
    expect(result).toContain("draftText");
    expect(result).toContain("EDIT");
  });

  it("includes hint stage instructions", () => {
    const result = buildGenerativeGenerationPrompt({ domain: "tech", generativeStage: "hint" });
    expect(result).toContain("hints");
    expect(result).toContain("HINT");
  });

  it("includes independent stage instructions", () => {
    const result = buildGenerativeGenerationPrompt({ domain: "tech", generativeStage: "independent" });
    expect(result).toContain("INDEPENDENT");
    expect(result).toContain("spareHint");
  });

  it("requires exactly 4 prompts", () => {
    const result = buildGenerativeGenerationPrompt({ domain: "tech", generativeStage: "edit" });
    expect(result).toContain("4 prompts");
  });

  it("interpolates userContext", () => {
    const result = buildGenerativeGenerationPrompt({
      domain: "tech",
      generativeStage: "edit",
      userContext: "product manager",
    });
    expect(result).toContain("product manager");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildGenerativeGenerationPrompt({
      domain: "tech",
      generativeStage: "hint",
      adaptationAppendix: "Practitioner band",
    });
    expect(result).toContain("Practitioner band");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildGenerativeGenerationPrompt({
      domain: "tech",
      generativeStage: "edit",
      customScenario: "AI ethics policy",
    });
    expect(result).toContain("AI ethics policy");
  });

  it("does not leak undefined", () => {
    const result = buildGenerativeGenerationPrompt({ domain: "test", generativeStage: "edit" });
    expect(result).not.toContain("undefined");
    expect(result).not.toContain("[object Object]");
  });
});

describe("buildGeopoliticsGenerativePrompt", () => {
  it("includes geopolitics-specific prompt structure", () => {
    const result = buildGeopoliticsGenerativePrompt({
      domain: "US foreign policy",
      generativeStage: "edit",
    });
    expect(result).toContain("geopolitical");
    expect(result).toContain("p1");
    expect(result).toContain("p4");
    expect(result).toContain("12 months");
    expect(result).toContain("upside surprise");
    expect(result).toContain("downside crisis");
  });

  it("includes domain", () => {
    const result = buildGeopoliticsGenerativePrompt({
      domain: "South China Sea",
      generativeStage: "hint",
    });
    expect(result).toContain("South China Sea");
  });

  it("includes edit stage draftText instruction", () => {
    const result = buildGeopoliticsGenerativePrompt({
      domain: "trade",
      generativeStage: "edit",
    });
    expect(result).toContain("draftText");
  });

  it("includes scenario block", () => {
    const result = buildGeopoliticsGenerativePrompt({
      domain: "trade",
      generativeStage: "independent",
      customScenario: "Tariff escalation",
    });
    expect(result).toContain("Tariff escalation");
  });
});

describe("GEOPOLITICS_GENERATIVE_RETRY_SUFFIX", () => {
  it("is a non-empty string with validation hints", () => {
    expect(GEOPOLITICS_GENERATIVE_RETRY_SUFFIX.length).toBeGreaterThan(50);
    expect(GEOPOLITICS_GENERATIVE_RETRY_SUFFIX).toContain("p1");
    expect(GEOPOLITICS_GENERATIVE_RETRY_SUFFIX).toContain("p4");
  });
});
