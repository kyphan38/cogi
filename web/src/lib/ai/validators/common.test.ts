import { describe, expect, it } from "vitest";
import {
  parseAnalyticalExerciseJson,
  isGeopoliticsAnalyticalPayload,
  validateGeopoliticsAnalyticalSemantics,
  validateAnalyticalSteelmanSemantics,
  analyticalVariantSchema,
  ANALYTICAL_STEELMAN_RETRY_SUFFIX,
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

  it("allows empty validPoints (loosened for steelman payloads)", () => {
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

describe("analyticalVariantSchema", () => {
  it("accepts highlight_tag and steelman", () => {
    expect(analyticalVariantSchema.safeParse("highlight_tag").success).toBe(true);
    expect(analyticalVariantSchema.safeParse("steelman").success).toBe(true);
  });

  it("rejects unknown variants", () => {
    expect(analyticalVariantSchema.safeParse("something_else").success).toBe(false);
  });
});

describe("validateAnalyticalSteelmanSemantics", () => {
  const validSteelman: AnalyticalExercise = {
    title: "Remote work is bad for productivity",
    passage: Array(100).fill("word").join(" "),
    embeddedIssues: [],
    validPoints: [],
  };

  it("returns no errors for a valid steelman payload", () => {
    expect(validateAnalyticalSteelmanSemantics(validSteelman)).toEqual([]);
  });

  it("catches non-empty embeddedIssues", () => {
    const bad: AnalyticalExercise = {
      ...validSteelman,
      embeddedIssues: [
        { description: "x", type: "logical_fallacy", severity: "obvious", textSegment: "x", explanation: "x" },
      ],
    };
    const errors = validateAnalyticalSteelmanSemantics(bad);
    expect(errors.some((e) => e.includes("embeddedIssues"))).toBe(true);
  });

  it("catches non-empty validPoints", () => {
    const bad: AnalyticalExercise = {
      ...validSteelman,
      validPoints: [{ textSegment: "x", explanation: "x" }],
    };
    const errors = validateAnalyticalSteelmanSemantics(bad);
    expect(errors.some((e) => e.includes("validPoints"))).toBe(true);
  });

  it("catches empty title", () => {
    const bad: AnalyticalExercise = { ...validSteelman, title: "  " };
    const errors = validateAnalyticalSteelmanSemantics(bad);
    expect(errors.some((e) => e.includes("title"))).toBe(true);
  });

  it("catches passage that is too short", () => {
    const bad: AnalyticalExercise = { ...validSteelman, passage: "Too short." };
    const errors = validateAnalyticalSteelmanSemantics(bad);
    expect(errors.some((e) => e.includes("80-250 words"))).toBe(true);
  });

  it("catches passage that is too long", () => {
    const bad: AnalyticalExercise = { ...validSteelman, passage: Array(300).fill("word").join(" ") };
    const errors = validateAnalyticalSteelmanSemantics(bad);
    expect(errors.some((e) => e.includes("80-250 words"))).toBe(true);
  });
});

describe("ANALYTICAL_STEELMAN_RETRY_SUFFIX", () => {
  it("is a non-empty string", () => {
    expect(typeof ANALYTICAL_STEELMAN_RETRY_SUFFIX).toBe("string");
    expect(ANALYTICAL_STEELMAN_RETRY_SUFFIX.length).toBeGreaterThan(0);
  });
});
