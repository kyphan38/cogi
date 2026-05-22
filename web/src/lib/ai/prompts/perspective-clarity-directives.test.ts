import { describe, expect, it } from "vitest";
import {
  SUITABLE_FOR_RULE,
  NO_INDEX_REFERENCE_RULE,
  CLARITY_BLUEPRINT_RULE,
  DEBATE_CLARITY_RULES,
  buildPerspectiveClarityPreamble,
} from "./perspective-clarity-directives";

describe("constants", () => {
  it("SUITABLE_FOR_RULE mentions suitableFor field", () => {
    expect(SUITABLE_FOR_RULE).toContain("suitableFor");
    expect(SUITABLE_FOR_RULE).toContain("Suitable for ");
  });

  it("NO_INDEX_REFERENCE_RULE prohibits bare index references", () => {
    expect(NO_INDEX_REFERENCE_RULE).toContain("PROHIBITION");
    expect(NO_INDEX_REFERENCE_RULE).toContain("index");
  });

  it("CLARITY_BLUEPRINT_RULE describes 3-part structure", () => {
    expect(CLARITY_BLUEPRINT_RULE).toContain("WHAT the user");
    expect(CLARITY_BLUEPRINT_RULE).toContain("blind spot");
  });

  it("DEBATE_CLARITY_RULES includes NO_INDEX_REFERENCE_RULE", () => {
    expect(DEBATE_CLARITY_RULES).toContain("PROHIBITION");
    expect(DEBATE_CLARITY_RULES).toContain("quotation marks");
  });
});

describe("buildPerspectiveClarityPreamble", () => {
  it("combines all three rules", () => {
    const result = buildPerspectiveClarityPreamble();
    expect(result).toContain("suitableFor");
    expect(result).toContain("PROHIBITION");
    expect(result).toContain("CLARITY BLUEPRINT");
  });

  it("starts with GLOBAL EVALUATION RULES", () => {
    const result = buildPerspectiveClarityPreamble();
    expect(result).toMatch(/^GLOBAL EVALUATION RULES/);
  });

  it("is trimmed", () => {
    const result = buildPerspectiveClarityPreamble();
    expect(result).toBe(result.trim());
  });
});
