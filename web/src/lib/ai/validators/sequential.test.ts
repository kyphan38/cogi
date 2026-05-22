import { describe, expect, it } from "vitest";
import { parseSequentialExerciseJson } from "./sequential";

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
