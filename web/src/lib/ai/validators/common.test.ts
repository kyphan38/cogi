import { describe, expect, it } from "vitest";
import {
  parseAnalyticalExerciseJson,
  isGeopoliticsAnalyticalPayload,
  validateAnalyticalSemantics,
  validateGeopoliticsAnalyticalSemantics,
  type AnalyticalExercise,
} from "./common";

const validAnalytical: AnalyticalExercise = {
  title: "Market Analysis",
  passage: "The company shows strong evidence of growth through strategic partnerships and aggressive expansion into emerging markets.",
  embeddedIssues: [
    { description: "Fallacy", type: "logical_fallacy", severity: "obvious", textSegment: "strong evidence of growth", explanation: "Vague" },
    { description: "Assumption", type: "hidden_assumption", severity: "moderate", textSegment: "strategic partnerships", explanation: "Unverified" },
    { description: "Weak", type: "weak_evidence", severity: "moderate", textSegment: "aggressive expansion", explanation: "No data" },
    { description: "Bias", type: "bias", severity: "subtle", textSegment: "emerging markets", explanation: "Selective" },
  ],
  validPoints: [
    { textSegment: "company shows", explanation: "Factual" },
    { textSegment: "expansion into", explanation: "Supported" },
  ],
};

const validGeopolitics: AnalyticalExercise = {
  title: "NATO Analysis",
  passage: "The alliance framing assumes Western interests are universal. Missing actor perspectives remain unaddressed. Historical causation is assumed without evidence. The analogy to Cold War partially fits.",
  embeddedIssues: [
    { description: "Framing", type: "framing_bias", severity: "obvious", textSegment: "framing assumes Western interests are universal", explanation: "One-sided" },
    { description: "Missing", type: "missing_actor", severity: "moderate", textSegment: "Missing actor perspectives remain unaddressed", explanation: "Absent" },
    { description: "Cause", type: "assumed_causation", severity: "moderate", textSegment: "Historical causation is assumed without evidence", explanation: "No proof" },
    { description: "Analogy", type: "analogy_misuse", severity: "subtle", textSegment: "analogy to Cold War partially fits", explanation: "Breaks down" },
  ],
  validPoints: [
    { textSegment: "The alliance", explanation: "Factual" },
    { textSegment: "partially fits", explanation: "Fair comparison" },
  ],
  hiddenPerspective: "US-aligned think tank",
  missingActors: ["Russia", "China"],
};

describe("parseAnalyticalExerciseJson", () => {
  it("parses valid JSON", () => {
    const result = parseAnalyticalExerciseJson(JSON.stringify(validAnalytical));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Market Analysis");
      expect(result.data.embeddedIssues).toHaveLength(4);
    }
  });

  it("strips markdown code fences", () => {
    const fenced = "```json\n" + JSON.stringify(validAnalytical) + "\n```";
    const result = parseAnalyticalExerciseJson(fenced);
    expect(result.success).toBe(true);
  });

  it("fails on invalid JSON", () => {
    const result = parseAnalyticalExerciseJson("not json");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Invalid JSON");
  });

  it("allows empty validPoints (counts are checked by the semantic validators)", () => {
    const bad = { ...validAnalytical, validPoints: [] };
    const result = parseAnalyticalExerciseJson(JSON.stringify(bad));
    expect(result.success).toBe(true);
  });

  it("fails on invalid issue type", () => {
    const bad = {
      ...validAnalytical,
      embeddedIssues: [{ ...validAnalytical.embeddedIssues[0], type: "not_a_type" }],
    };
    const result = parseAnalyticalExerciseJson(JSON.stringify(bad));
    expect(result.success).toBe(false);
  });

  it("accepts optional isSoundReasoning", () => {
    const sound = { ...validAnalytical, isSoundReasoning: true, embeddedIssues: [] };
    const result = parseAnalyticalExerciseJson(JSON.stringify(sound));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isSoundReasoning).toBe(true);
  });

  it("accepts optional geopolitics fields", () => {
    const result = parseAnalyticalExerciseJson(JSON.stringify(validGeopolitics));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hiddenPerspective).toBe("US-aligned think tank");
      expect(result.data.missingActors).toEqual(["Russia", "China"]);
    }
  });

  it("rejects missingActors with more than 3 entries", () => {
    const bad = { ...validGeopolitics, missingActors: ["a", "b", "c", "d"] };
    const result = parseAnalyticalExerciseJson(JSON.stringify(bad));
    expect(result.success).toBe(false);
  });
});

describe("isGeopoliticsAnalyticalPayload", () => {
  it("returns true when hiddenPerspective is set", () => {
    expect(isGeopoliticsAnalyticalPayload(validGeopolitics)).toBe(true);
  });

  it("returns true when geo issue types present", () => {
    const data: AnalyticalExercise = {
      ...validAnalytical,
      embeddedIssues: [{ description: "x", type: "framing_bias", severity: "obvious", textSegment: "x", explanation: "x" }],
    };
    expect(isGeopoliticsAnalyticalPayload(data)).toBe(true);
  });

  it("returns false for standard analytical", () => {
    expect(isGeopoliticsAnalyticalPayload(validAnalytical)).toBe(false);
  });
});

describe("validateGeopoliticsAnalyticalSemantics", () => {
  it("returns no errors for valid geopolitics payload", () => {
    expect(validateGeopoliticsAnalyticalSemantics(validGeopolitics)).toEqual([]);
  });

  it("skips validation for non-geopolitics payload", () => {
    expect(validateGeopoliticsAnalyticalSemantics(validAnalytical)).toEqual([]);
  });

  it("catches missing hiddenPerspective", () => {
    const bad = { ...validGeopolitics, hiddenPerspective: "" };
    const errors = validateGeopoliticsAnalyticalSemantics(bad);
    expect(errors.some((e) => e.includes("hiddenPerspective"))).toBe(true);
  });

  it("catches wrong number of embeddedIssues", () => {
    const bad = { ...validGeopolitics, embeddedIssues: validGeopolitics.embeddedIssues.slice(0, 2) };
    const errors = validateGeopoliticsAnalyticalSemantics(bad);
    expect(errors.some((e) => e.includes("exactly 4"))).toBe(true);
  });

  it("catches wrong number of validPoints", () => {
    const bad = { ...validGeopolitics, validPoints: [validGeopolitics.validPoints[0]] };
    const errors = validateGeopoliticsAnalyticalSemantics(bad);
    expect(errors.some((e) => e.includes("exactly 2"))).toBe(true);
  });

  it("catches missing geo issue type", () => {
    const bad = {
      ...validGeopolitics,
      embeddedIssues: [
        ...validGeopolitics.embeddedIssues.slice(0, 3),
        { ...validGeopolitics.embeddedIssues[0], type: "framing_bias" as const },
      ],
    };
    const errors = validateGeopoliticsAnalyticalSemantics(bad);
    expect(errors.some((e) => e.includes("analogy_misuse"))).toBe(true);
  });

  it("catches wrong severity distribution", () => {
    const bad = {
      ...validGeopolitics,
      embeddedIssues: validGeopolitics.embeddedIssues.map((i) => ({ ...i, severity: "obvious" as const })),
    };
    const errors = validateGeopoliticsAnalyticalSemantics(bad);
    expect(errors.some((e) => e.includes("severities"))).toBe(true);
  });

  it("catches missingActors outside 1-2 range", () => {
    const bad = { ...validGeopolitics, missingActors: [] as string[] };
    const errors = validateGeopoliticsAnalyticalSemantics(bad);
    expect(errors.some((e) => e.includes("1-2 entries"))).toBe(true);
  });

  it("catches textSegment not found in passage", () => {
    const bad = {
      ...validGeopolitics,
      embeddedIssues: validGeopolitics.embeddedIssues.map((i) => ({ ...i, textSegment: "not in passage at all xyz" })),
    };
    const errors = validateGeopoliticsAnalyticalSemantics(bad);
    expect(errors.some((e) => e.includes("textSegment not found"))).toBe(true);
  });
});

describe("validateAnalyticalSemantics", () => {
  it("accepts a valid plain passage", () => {
    expect(validateAnalyticalSemantics(validAnalytical)).toEqual([]);
  });

  it("rejects the wrong number of issues and decoys", () => {
    const bad = {
      ...validAnalytical,
      embeddedIssues: validAnalytical.embeddedIssues.slice(0, 3),
      validPoints: validAnalytical.validPoints.slice(0, 1),
    };
    const errors = validateAnalyticalSemantics(bad);
    expect(errors).toContain("embeddedIssues must have exactly 4 items");
    expect(errors).toContain("validPoints must have exactly 2 items");
  });

  it("rejects a wrong severity mix", () => {
    const bad = {
      ...validAnalytical,
      embeddedIssues: validAnalytical.embeddedIssues.map((i) => ({ ...i, severity: "moderate" as const })),
    };
    expect(validateAnalyticalSemantics(bad)).toContain("severities must be 1 obvious, 2 moderate, 1 subtle");
  });

  it("rejects geopolitics issue types on a plain passage", () => {
    const bad = {
      ...validAnalytical,
      embeddedIssues: [
        { ...validAnalytical.embeddedIssues[0], type: "framing_bias" as const },
        ...validAnalytical.embeddedIssues.slice(1),
      ],
    };
    expect(validateAnalyticalSemantics(bad).some((e) => e.includes("framing_bias"))).toBe(true);
  });

  it("rejects segments that are not in the passage", () => {
    const bad = {
      ...validAnalytical,
      embeddedIssues: [
        { ...validAnalytical.embeddedIssues[0], textSegment: "a sentence the passage never says" },
        ...validAnalytical.embeddedIssues.slice(1),
      ],
      validPoints: [validAnalytical.validPoints[0], { textSegment: "nowhere to be found", explanation: "x" }],
    };
    const errors = validateAnalyticalSemantics(bad);
    expect(errors).toContain("textSegment not found in passage for issue type logical_fallacy");
    expect(errors).toContain("textSegment not found in passage for a validPoint");
  });

  it("rejects isSoundReasoning on a passage with issues", () => {
    const bad = { ...validAnalytical, isSoundReasoning: true };
    expect(validateAnalyticalSemantics(bad)).toContain(
      "isSoundReasoning must not be true for a passage with embedded issues",
    );
  });

  it("accepts a sound-reasoning passage with no issues and 2-3 decoys", () => {
    const sound = { ...validAnalytical, embeddedIssues: [], isSoundReasoning: true };
    expect(validateAnalyticalSemantics(sound, { expectSound: true })).toEqual([]);
  });

  it("rejects a sound-reasoning passage that still has issues", () => {
    const errors = validateAnalyticalSemantics(validAnalytical, { expectSound: true });
    expect(errors).toContain("embeddedIssues must be empty for a sound-reasoning passage");
  });
});
