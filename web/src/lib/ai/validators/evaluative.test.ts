import { describe, expect, it } from "vitest";
import {
  parseEvaluativeExerciseJson,
  validateEvaluativeSemantics,
  isGeopoliticsEvaluativePayload,
  validateGeopoliticsEvaluativeSemantics,
} from "./evaluative";

const validMatrix = {
  variant: "matrix",
  title: "Decision Framework",
  scenario: "Choose office location",
  axisX: { label: "Cost", lowLabel: "Cheap", highLabel: "Expensive" },
  axisY: { label: "Talent", lowLabel: "Low", highLabel: "High" },
  options: [
    { id: "o1", title: "Downtown", description: "City center", intendedQuadrant: "top-right", explanation: "High cost, high talent" },
    { id: "o2", title: "Suburbs", description: "Outskirts", intendedQuadrant: "bottom-left", explanation: "Low cost, low talent" },
    { id: "o3", title: "Remote hub", description: "Shared space", intendedQuadrant: "bottom-right", explanation: "Low cost, high talent" },
    { id: "o4", title: "Cowork", description: "Flexible", intendedQuadrant: "top-left", explanation: "High cost, low talent" },
  ],
};

const validScoring = {
  variant: "scoring",
  title: "Vendor Selection",
  scenario: "Choose cloud provider",
  criteria: [
    { id: "c1", label: "Cost", description: "Total cost of ownership for 3 years", suggestedWeight: 4 },
    { id: "c2", label: "Reliability", description: "Uptime SLA and historical performance", suggestedWeight: 5 },
    { id: "c3", label: "Support", description: "Quality of technical support team available", suggestedWeight: 3 },
  ],
  options: [
    { id: "v1", title: "AWS", description: "Amazon cloud", suggestedScores: { c1: 3, c2: 5, c3: 4 }, explanation: "Strong reliability" },
    { id: "v2", title: "GCP", description: "Google cloud", suggestedScores: { c1: 4, c2: 4, c3: 3 }, explanation: "Good pricing" },
  ],
  hiddenCriteria: [{ label: "Lock-in", description: "Vendor lock-in risk assessment and migration cost" }],
};

describe("parseEvaluativeExerciseJson", () => {
  it("parses valid matrix payload", () => {
    const result = parseEvaluativeExerciseJson(JSON.stringify(validMatrix));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.variant).toBe("matrix");
  });

  it("parses valid scoring payload", () => {
    const result = parseEvaluativeExerciseJson(JSON.stringify(validScoring));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.variant).toBe("scoring");
  });

  it("fails on invalid JSON", () => {
    expect(parseEvaluativeExerciseJson("bad").success).toBe(false);
  });

  it("fails on invalid variant", () => {
    const bad = { ...validMatrix, variant: "other" };
    expect(parseEvaluativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when matrix has < 4 options", () => {
    const bad = { ...validMatrix, options: validMatrix.options.slice(0, 2) };
    expect(parseEvaluativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when scoring has < 3 criteria", () => {
    const bad = { ...validScoring, criteria: validScoring.criteria.slice(0, 1) };
    expect(parseEvaluativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when scoring has empty hiddenCriteria", () => {
    const bad = { ...validScoring, hiddenCriteria: [] };
    expect(parseEvaluativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails on invalid quadrant value", () => {
    const bad = { ...validMatrix, options: validMatrix.options.map((o) => ({ ...o, intendedQuadrant: "middle" })) };
    expect(parseEvaluativeExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("detects geopolitics variant with stakeholderNote", () => {
    const geo = { ...validScoring, stakeholderNote: "The primary decision-maker is the PM.",
      criteria: [...validScoring.criteria, { id: "c4", label: "Sec", description: "Security and compliance requirements for government", suggestedWeight: 4 }],
      options: [...validScoring.options, { id: "v3", title: "Azure", description: "MS cloud", suggestedScores: { c1: 3, c2: 4, c3: 5, c4: 4 }, explanation: "Good compliance" }],
      hiddenCriteria: [...validScoring.hiddenCriteria, { label: "Sovereignty", description: "Data sovereignty concerns for government" }],
    };
    const result = parseEvaluativeExerciseJson(JSON.stringify(geo));
    expect(result.success).toBe(true);
    if (result.success) expect(isGeopoliticsEvaluativePayload(result.data)).toBe(true);
  });
});

describe("validateEvaluativeSemantics", () => {
  it("returns no errors for valid matrix", () => {
    expect(validateEvaluativeSemantics(validMatrix as never)).toEqual([]);
  });

  it("catches duplicate matrix option ids", () => {
    const dup = { ...validMatrix, options: validMatrix.options.map((o) => ({ ...o, id: "same" })) };
    const errors = validateEvaluativeSemantics(dup as never);
    expect(errors.some((e) => e.includes("unique"))).toBe(true);
  });

  it("returns no errors for valid scoring", () => {
    expect(validateEvaluativeSemantics(validScoring as never)).toEqual([]);
  });

  it("catches missing suggestedScores key for scoring", () => {
    const bad = {
      ...validScoring,
      options: [
        { id: "v1", title: "X", description: "X", suggestedScores: { c1: 3 }, explanation: "X" },
      ],
    };
    const errors = validateEvaluativeSemantics(bad as never);
    expect(errors.some((e) => e.includes("missing suggestedScores"))).toBe(true);
  });

  it("catches unknown suggestedScores key", () => {
    const bad = {
      ...validScoring,
      options: [
        { id: "v1", title: "X", description: "X", suggestedScores: { c1: 3, c2: 4, c3: 3, c_unknown: 2 }, explanation: "X" },
      ],
    };
    const errors = validateEvaluativeSemantics(bad as never);
    expect(errors.some((e) => e.includes("unknown suggestedScores key"))).toBe(true);
  });
});

describe("validateGeopoliticsEvaluativeSemantics", () => {
  it("rejects non-geopolitics payload", () => {
    const errors = validateGeopoliticsEvaluativeSemantics(validScoring as never);
    expect(errors.some((e) => e.includes("stakeholderNote"))).toBe(true);
  });

  it("catches short criterion descriptions", () => {
    const geo = {
      ...validScoring,
      stakeholderNote: "PM is primary",
      criteria: validScoring.criteria.map((c) => ({ ...c, description: "short" })),
      options: validScoring.options,
      hiddenCriteria: [...validScoring.hiddenCriteria, { label: "X", description: "Extra hidden criterion for testing" }],
    };
    const result = parseEvaluativeExerciseJson(JSON.stringify(geo));
    if (result.success) {
      const errors = validateGeopoliticsEvaluativeSemantics(result.data);
      expect(errors.some((e) => e.includes("whose interest"))).toBe(true);
    }
  });
});
