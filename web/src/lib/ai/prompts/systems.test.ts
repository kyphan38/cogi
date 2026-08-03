import { describe, expect, it } from "vitest";
import {
  buildSystemsGenerationPrompt,
  buildGeopoliticsSystemsPrompt,
  buildSystemsResilienceGenerationPrompt,
} from "./systems";

describe("buildSystemsGenerationPrompt", () => {
  it("returns non-empty string containing domain", () => {
    const result = buildSystemsGenerationPrompt({ domain: "supply chain" });
    expect(result).toContain("supply chain");
    expect(result.length).toBeGreaterThan(100);
  });

  it("specifies exactly 6 nodes with correct ids", () => {
    const result = buildSystemsGenerationPrompt({ domain: "tech" });
    expect(result).toContain("6 nodes");
    expect(result).toContain("node_1");
    expect(result).toContain("node_6");
  });

  it("includes connection type enum", () => {
    const result = buildSystemsGenerationPrompt({ domain: "tech" });
    expect(result).toContain("depends_on");
    expect(result).toContain("conflicts_with");
    expect(result).toContain("enables");
    expect(result).toContain("risks");
  });

  it("requires feedback loop", () => {
    const result = buildSystemsGenerationPrompt({ domain: "tech" });
    expect(result).toContain("feedback loop");
  });

  it("includes shockEvent structure", () => {
    const result = buildSystemsGenerationPrompt({ domain: "tech" });
    expect(result).toContain("shockEvent");
    expect(result).toContain("directlyAffected");
    expect(result).toContain("indirectlyAffected");
  });

  it("interpolates userContext", () => {
    const result = buildSystemsGenerationPrompt({ domain: "tech", userContext: "DevOps" });
    expect(result).toContain("DevOps");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildSystemsGenerationPrompt({ domain: "tech", adaptationAppendix: "Foundation tier" });
    expect(result).toContain("Foundation tier");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildSystemsGenerationPrompt({ domain: "tech", customScenario: "Microservices outage" });
    expect(result).toContain("Microservices outage");
  });

  it("does not leak undefined", () => {
    const result = buildSystemsGenerationPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
  });
});

describe("buildGeopoliticsSystemsPrompt", () => {
  it("includes dual-perspective structure", () => {
    const result = buildGeopoliticsSystemsPrompt({ domain: "US-China" });
    expect(result).toContain("perspectiveAName");
    expect(result).toContain("perspectiveBName");
    expect(result).toContain("intendedConnectionsB");
    expect(result).toContain("shockEventB");
  });

  it("still requires 6 nodes", () => {
    const result = buildGeopoliticsSystemsPrompt({ domain: "NATO" });
    expect(result).toContain("node_1");
    expect(result).toContain("node_6");
    expect(result).toContain("6 nodes");
  });

  it("includes domain", () => {
    const result = buildGeopoliticsSystemsPrompt({ domain: "Middle East" });
    expect(result).toContain("Middle East");
  });

  it("includes adaptation appendix", () => {
    const result = buildGeopoliticsSystemsPrompt({ domain: "trade", adaptationAppendix: "Advanced" });
    expect(result).toContain("Advanced");
  });

  it("includes scenario block", () => {
    const result = buildGeopoliticsSystemsPrompt({ domain: "trade", customScenario: "Trade war" });
    expect(result).toContain("Trade war");
  });
});

describe("buildSystemsResilienceGenerationPrompt", () => {
  it("includes domain and variantKind marker", () => {
    const result = buildSystemsResilienceGenerationPrompt({ domain: "power grid" });
    expect(result).toContain("power grid");
    expect(result).toContain('"variantKind": "resilience"');
  });

  it("still requires 6 nodes", () => {
    const result = buildSystemsResilienceGenerationPrompt({ domain: "logistics" });
    expect(result).toContain("node_1");
    expect(result).toContain("node_6");
    expect(result).toContain("6 nodes");
  });

  it("includes criticalityGroundTruth structure keyed by rationale (matches schema field)", () => {
    const result = buildSystemsResilienceGenerationPrompt({ domain: "logistics" });
    expect(result).toContain("criticalityGroundTruth");
    expect(result).toContain("criticalityRank");
    expect(result).toContain('"rationale"');
    expect(result).not.toContain('"explanation": string }\n  ],\n  "shockEvent"');
  });

  it("includes secondShockEvent cascading from the first shock", () => {
    const result = buildSystemsResilienceGenerationPrompt({ domain: "logistics" });
    expect(result).toContain("secondShockEvent");
    expect(result).toContain("cascades FROM the consequences of the first shock");
  });

  it("includes adaptation appendix when provided", () => {
    const result = buildSystemsResilienceGenerationPrompt({
      domain: "logistics",
      adaptationAppendix: "Foundation tier",
    });
    expect(result).toContain("Foundation tier");
  });

  it("includes scenario block when customScenario provided", () => {
    const result = buildSystemsResilienceGenerationPrompt({
      domain: "logistics",
      customScenario: "Warehouse automation rollout",
    });
    expect(result).toContain("Warehouse automation rollout");
  });

  it("does not leak undefined", () => {
    const result = buildSystemsResilienceGenerationPrompt({ domain: "test" });
    expect(result).not.toContain("undefined");
  });
});
