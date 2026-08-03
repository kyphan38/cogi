import { describe, expect, it } from "vitest";
import {
  isGeopoliticsSequentialPayload,
  isTriageSequentialPayload,
  parseSequentialExerciseJson,
  validateGeopoliticsSequentialSemantics,
  validateSequentialTriageSemantics,
  type SequentialGeopoliticsExercisePayload,
  type SequentialTriageExercisePayload,
} from "./sequential";

function makeStep(id: string, pos: number) {
  return { id, text: `Step ${id}`, correctPosition: pos, dependencies: [], isFlexible: false, explanation: `Why ${id}` };
}

const validPayload = {
  title: "Deployment Pipeline",
  scenario: "Deploy a web application to production safely",
  steps: [
    makeStep("s1", 0),
    makeStep("s2", 1),
    makeStep("s3", 2),
    makeStep("s4", 3),
    makeStep("s5", 4),
    makeStep("s6", 5),
  ],
  criticalErrors: [{ description: "Deploying without tests", severity: "catastrophic" }],
};

describe("parseSequentialExerciseJson", () => {
  it("parses valid JSON", () => {
    const result = parseSequentialExerciseJson(JSON.stringify(validPayload));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toHaveLength(6);
      expect(result.data.title).toBe("Deployment Pipeline");
    }
  });

  it("strips markdown code fences", () => {
    const fenced = "```json\n" + JSON.stringify(validPayload) + "\n```";
    expect(parseSequentialExerciseJson(fenced).success).toBe(true);
  });

  it("fails on invalid JSON", () => {
    const result = parseSequentialExerciseJson("{bad");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Invalid JSON");
  });

  it("fails when steps < 6", () => {
    const bad = { ...validPayload, steps: validPayload.steps.slice(0, 4) };
    const result = parseSequentialExerciseJson(JSON.stringify(bad));
    expect(result.success).toBe(false);
  });

  it("accepts up to 10 steps", () => {
    const steps = Array.from({ length: 10 }, (_, i) => makeStep(`s${i + 1}`, i));
    const good = { ...validPayload, steps };
    expect(parseSequentialExerciseJson(JSON.stringify(good)).success).toBe(true);
  });

  it("fails when steps > 10", () => {
    const steps = Array.from({ length: 11 }, (_, i) => makeStep(`s${i + 1}`, i));
    const bad = { ...validPayload, steps };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when criticalErrors is empty", () => {
    const bad = { ...validPayload, criticalErrors: [] };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails on invalid severity value", () => {
    const bad = {
      ...validPayload,
      criticalErrors: [{ description: "x", severity: "minor" }],
    };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when step id is empty", () => {
    const bad = {
      ...validPayload,
      steps: validPayload.steps.map((s, i) => (i === 0 ? { ...s, id: "" } : s)),
    };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when correctPosition is negative", () => {
    const bad = {
      ...validPayload,
      steps: validPayload.steps.map((s, i) => (i === 0 ? { ...s, correctPosition: -1 } : s)),
    };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });
});

function makeGeoStep(id: string, posA: number, posB: number) {
  return {
    id,
    text: `Step ${id}`,
    correctPosition: posA,
    correctPositionB: posB,
    dependencies: [],
    isFlexible: false,
    explanation: `Why ${id}`,
  };
}

const validGeoPayload = {
  title: "Crisis Response",
  scenario: "Two states respond to the same regional crisis",
  perspectiveAName: "Actor A",
  perspectiveBName: "Actor B",
  steps: [
    makeGeoStep("s1", 0, 5),
    makeGeoStep("s2", 1, 4),
    makeGeoStep("s3", 2, 3),
    makeGeoStep("s4", 3, 2),
    makeGeoStep("s5", 4, 1),
    makeGeoStep("s6", 5, 0),
  ],
  criticalErrors: [{ description: "Actor A misstep", severity: "catastrophic" }],
  criticalErrorsB: [{ description: "Actor B misstep", severity: "problematic" }],
};

function makeTriageStep(id: string, pos: number, severity: "critical" | "major" | "minor") {
  return {
    id,
    text: `Step ${id}`,
    correctPosition: pos,
    dependencies: [],
    isFlexible: false,
    severity,
    explanation: `Why ${id}`,
  };
}

const validTriagePayload = {
  title: "Payment Outage Triage",
  scenario: "Restore payment processing under a tight time limit",
  variantKind: "triage",
  timeLimitMinutes: 20,
  steps: [
    makeTriageStep("s1", 0, "critical"),
    makeTriageStep("s2", 1, "critical"),
    makeTriageStep("s3", 2, "major"),
    makeTriageStep("s4", 3, "major"),
    makeTriageStep("s5", 4, "minor"),
    makeTriageStep("s6", 5, "minor"),
  ],
  criticalErrors: [{ description: "Deploying before isolating the failure", severity: "catastrophic" }],
};

describe("parseSequentialExerciseJson - geopolitics dispatch", () => {
  it("parses a valid geopolitics payload via perspectiveAName marker", () => {
    const result = parseSequentialExerciseJson(JSON.stringify(validGeoPayload));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(isGeopoliticsSequentialPayload(result.data)).toBe(true);
      expect(isTriageSequentialPayload(result.data)).toBe(false);
    }
  });

  it("fails when correctPositionB is missing", () => {
    const bad = {
      ...validGeoPayload,
      steps: validGeoPayload.steps.map(({ correctPositionB: _drop, ...rest }) => rest),
    };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when criticalErrorsB is empty", () => {
    const bad = { ...validGeoPayload, criticalErrorsB: [] };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });
});

describe("parseSequentialExerciseJson - triage dispatch", () => {
  it("parses a valid triage payload via variantKind marker", () => {
    const result = parseSequentialExerciseJson(JSON.stringify(validTriagePayload));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(isTriageSequentialPayload(result.data)).toBe(true);
      expect(isGeopoliticsSequentialPayload(result.data)).toBe(false);
    }
  });

  it("fails when a step is missing severity", () => {
    const bad = {
      ...validTriagePayload,
      steps: validTriagePayload.steps.map((s, i) =>
        i === 0 ? { ...s, severity: undefined } : s,
      ),
    };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails when timeLimitMinutes is out of bounds", () => {
    const bad = { ...validTriagePayload, timeLimitMinutes: 500 };
    expect(parseSequentialExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });
});

describe("validateGeopoliticsSequentialSemantics", () => {
  it("returns no errors for a valid payload", () => {
    const parsed = parseSequentialExerciseJson(JSON.stringify(validGeoPayload));
    if (!parsed.success) throw new Error("expected valid parse");
    const errors = validateGeopoliticsSequentialSemantics(
      parsed.data as SequentialGeopoliticsExercisePayload,
    );
    expect(errors).toEqual([]);
  });

  it("flags when perspectiveAName equals perspectiveBName", () => {
    const bad = { ...validGeoPayload, perspectiveBName: "Actor A" };
    const parsed = parseSequentialExerciseJson(JSON.stringify(bad));
    if (!parsed.success) throw new Error("expected valid parse");
    const errors = validateGeopoliticsSequentialSemantics(
      parsed.data as SequentialGeopoliticsExercisePayload,
    );
    expect(errors.some((e) => e.includes("must differ"))).toBe(true);
  });

  it("flags a non-permutation correctPositionB", () => {
    const bad = {
      ...validGeoPayload,
      steps: validGeoPayload.steps.map((s, i) => (i === 0 ? { ...s, correctPositionB: 4 } : s)),
    };
    const parsed = parseSequentialExerciseJson(JSON.stringify(bad));
    if (!parsed.success) throw new Error("expected valid parse");
    const errors = validateGeopoliticsSequentialSemantics(
      parsed.data as SequentialGeopoliticsExercisePayload,
    );
    expect(errors.some((e) => e.includes("correctPositionB"))).toBe(true);
  });

  it("flags a dependency cycle", () => {
    const bad = {
      ...validGeoPayload,
      steps: validGeoPayload.steps.map((s, i, arr) =>
        i < 2 ? { ...s, dependencies: [arr[(i + 1) % 2]!.id] } : s,
      ),
    };
    const parsed = parseSequentialExerciseJson(JSON.stringify(bad));
    if (!parsed.success) throw new Error("expected valid parse");
    const errors = validateGeopoliticsSequentialSemantics(
      parsed.data as SequentialGeopoliticsExercisePayload,
    );
    expect(errors.some((e) => e.includes("cycle"))).toBe(true);
  });
});

describe("validateSequentialTriageSemantics", () => {
  it("returns no errors for a valid payload", () => {
    const parsed = parseSequentialExerciseJson(JSON.stringify(validTriagePayload));
    if (!parsed.success) throw new Error("expected valid parse");
    const errors = validateSequentialTriageSemantics(
      parsed.data as SequentialTriageExercisePayload,
    );
    expect(errors).toEqual([]);
  });

  it("flags when no step has critical severity", () => {
    const bad = {
      ...validTriagePayload,
      steps: validTriagePayload.steps.map((s) => ({ ...s, severity: "minor" as const })),
    };
    const parsed = parseSequentialExerciseJson(JSON.stringify(bad));
    if (!parsed.success) throw new Error("expected valid parse");
    const errors = validateSequentialTriageSemantics(
      parsed.data as SequentialTriageExercisePayload,
    );
    expect(errors.some((e) => e.includes("critical"))).toBe(true);
  });

  it("flags a non-permutation correctPosition", () => {
    const bad = {
      ...validTriagePayload,
      steps: validTriagePayload.steps.map((s, i) => (i === 0 ? { ...s, correctPosition: 1 } : s)),
    };
    const parsed = parseSequentialExerciseJson(JSON.stringify(bad));
    if (!parsed.success) throw new Error("expected valid parse");
    const errors = validateSequentialTriageSemantics(
      parsed.data as SequentialTriageExercisePayload,
    );
    expect(errors.some((e) => e.includes("correctPosition"))).toBe(true);
  });
});
