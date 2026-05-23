import { describe, expect, it } from "vitest";
import { normalizeAdaptiveHints, buildAdaptationAppendix } from "./adaptive-appendix";

describe("normalizeAdaptiveHints", () => {
  it("returns null for null/undefined", () => {
    expect(normalizeAdaptiveHints(null)).toBeNull();
    expect(normalizeAdaptiveHints(undefined)).toBeNull();
  });

  it("returns null for non-object", () => {
    expect(normalizeAdaptiveHints("string")).toBeNull();
    expect(normalizeAdaptiveHints(42)).toBeNull();
  });

  it("returns null when enabled is not true", () => {
    expect(normalizeAdaptiveHints({ enabled: false, exerciseType: "analytical" })).toBeNull();
  });

  it("returns null for invalid exerciseType", () => {
    expect(normalizeAdaptiveHints({ enabled: true, exerciseType: "bogus" })).toBeNull();
  });

  it("normalizes a valid payload", () => {
    const result = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      tier: "Practitioner",
      rollingAccuracy: 72.6,
      sampleCount: 5,
      weaknessTypesToInject: ["bias", "framing"],
    });
    expect(result).toEqual({
      enabled: true,
      exerciseType: "analytical",
      tier: "Practitioner",
      rollingAccuracy: 73,
      sampleCount: 5,
      weaknessTypesToInject: ["bias", "framing"],
    });
  });

  it("clamps rollingAccuracy to 0-100", () => {
    const over = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "sequential",
      rollingAccuracy: 150,
      sampleCount: 1,
    });
    expect(over!.rollingAccuracy).toBe(100);

    const under = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "sequential",
      rollingAccuracy: -10,
      sampleCount: 1,
    });
    expect(under!.rollingAccuracy).toBe(0);
  });

  it("returns null tier for invalid tier string", () => {
    const result = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "systems",
      tier: "Beginner",
    });
    expect(result!.tier).toBeNull();
  });

  it("accepts all valid exercise types", () => {
    for (const t of ["analytical", "sequential", "systems", "evaluative", "generative"]) {
      const r = normalizeAdaptiveHints({ enabled: true, exerciseType: t });
      expect(r).not.toBeNull();
      expect(r!.exerciseType).toBe(t);
    }
  });

  it("caps weaknessTypesToInject at 6 and filters non-strings", () => {
    const result = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      weaknessTypesToInject: ["a", "b", "c", "d", "e", "f", "g", 42, "", "h"],
    });
    expect(result!.weaknessTypesToInject).toHaveLength(6);
    expect(result!.weaknessTypesToInject).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("defaults sampleCount to 0 when missing", () => {
    const result = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
    });
    expect(result!.sampleCount).toBe(0);
  });

  it("returns null rollingAccuracy for non-finite values", () => {
    const result = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      rollingAccuracy: NaN,
      sampleCount: 1,
    });
    expect(result!.rollingAccuracy).toBeNull();
  });
});

describe("buildAdaptationAppendix", () => {
  it("returns undefined when hints is null", () => {
    expect(buildAdaptationAppendix(null, "analytical")).toBeUndefined();
  });

  it("returns undefined when exerciseType mismatches", () => {
    const hints = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "sequential",
      tier: "Foundation",
      rollingAccuracy: 50,
      sampleCount: 3,
    })!;
    expect(buildAdaptationAppendix(hints, "analytical")).toBeUndefined();
  });

  it("includes performance line when accuracy and samples present", () => {
    const hints = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      tier: "Practitioner",
      rollingAccuracy: 65,
      sampleCount: 4,
    })!;
    const result = buildAdaptationAppendix(hints, "analytical")!;
    expect(result).toContain("~65%");
    expect(result).toContain("4 completed");
  });

  it("includes sparse data line when no accuracy", () => {
    const hints = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      tier: "Foundation",
    })!;
    const result = buildAdaptationAppendix(hints, "analytical")!;
    expect(result).toContain("sparse");
  });

  it("includes tier guidance for each exercise type", () => {
    for (const t of ["analytical", "sequential", "systems", "evaluative", "generative"] as const) {
      const hints = normalizeAdaptiveHints({
        enabled: true,
        exerciseType: t,
        tier: "Expert",
        rollingAccuracy: 90,
        sampleCount: 10,
      })!;
      const result = buildAdaptationAppendix(hints, t)!;
      expect(result).toContain("Expert");
    }
  });

  it("includes weakness emphasis when weaknesses present", () => {
    const hints = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      tier: "Advanced",
      rollingAccuracy: 70,
      sampleCount: 5,
      weaknessTypesToInject: ["bias", "causal_fallacy"],
    })!;
    const result = buildAdaptationAppendix(hints, "analytical")!;
    expect(result).toContain("bias, causal_fallacy");
    expect(result).toContain("Weakness emphasis");
  });

  it("omits weakness line when no weaknesses", () => {
    const hints = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      tier: "Foundation",
      rollingAccuracy: 50,
      sampleCount: 2,
    })!;
    const result = buildAdaptationAppendix(hints, "analytical")!;
    expect(result).not.toContain("Weakness emphasis");
  });

  it("includes neutral guidance when tier is null", () => {
    const hints = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "analytical",
      tier: null,
      rollingAccuracy: 50,
      sampleCount: 2,
    })!;
    const result = buildAdaptationAppendix(hints, "analytical")!;
    expect(result).toContain("neutral");
  });

  it("starts with adaptive guidance header", () => {
    const hints = normalizeAdaptiveHints({
      enabled: true,
      exerciseType: "systems",
      tier: "Advanced",
      rollingAccuracy: 80,
      sampleCount: 6,
    })!;
    const result = buildAdaptationAppendix(hints, "systems")!;
    expect(result).toMatch(/^--- Adaptive guidance/);
  });
});
