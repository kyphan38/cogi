import { describe, expect, it } from "vitest";
import {
  analyticalResponseSchema,
  evaluativeResponseSchema,
  systemsResponseSchema,
} from "./response-schemas";

type Obj = { properties: Record<string, { items?: { properties: { type: { enum: string[] } } } }>; required?: string[] };

describe("Gemini response schemas", () => {
  it("drop the $schema key", () => {
    expect(analyticalResponseSchema(false)).not.toHaveProperty("$schema");
  });

  it("keep geopolitics-only fields off plain analytical passages", () => {
    const plain = analyticalResponseSchema(false) as unknown as Obj;
    expect(plain.properties).not.toHaveProperty("hiddenPerspective");
    expect(plain.properties).not.toHaveProperty("missingActors");
    expect(plain.properties.embeddedIssues.items!.properties.type.enum).toEqual([
      "logical_fallacy",
      "hidden_assumption",
      "weak_evidence",
      "bias",
    ]);
  });

  it("require the geopolitics fields on geopolitics passages", () => {
    const geo = analyticalResponseSchema(true) as unknown as Obj;
    expect(geo.required).toEqual(expect.arrayContaining(["hiddenPerspective", "missingActors"]));
    expect(geo.properties.embeddedIssues.items!.properties.type.enum).toContain("framing_bias");
  });

  it("pick the evaluative shape from the task type", () => {
    expect(evaluativeResponseSchema("auto", false)).toHaveProperty("anyOf");
    const deal = evaluativeResponseSchema("dealbreaker", false) as unknown as Obj;
    expect(deal.properties).toHaveProperty("criteria");
    const unc = evaluativeResponseSchema("uncertainty", false) as unknown as Obj;
    expect(unc.properties.options).toBeDefined();
    const geo = evaluativeResponseSchema("auto", true) as unknown as Obj;
    expect(geo.required).toContain("stakeholderNote");
  });

  it("pick the systems shape from the task type", () => {
    const res = systemsResponseSchema("resilience", false) as unknown as Obj;
    expect(res.required).toContain("criticalityGroundTruth");
    const geo = systemsResponseSchema("auto", true) as unknown as Obj;
    expect(geo.required).toContain("perspectiveAName");
    const plain = systemsResponseSchema("auto", false) as unknown as Obj;
    expect(plain.properties).not.toHaveProperty("perspectiveAName");
  });
});
