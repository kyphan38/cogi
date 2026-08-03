import { describe, expect, it } from "vitest";
import { computeSequentialAccuracy, computeSequentialTriageAccuracy } from "./calibration-sequential";
import type { SequentialStepSpec } from "@/lib/types/exercise";

function makeSteps(): SequentialStepSpec[] {
  return [
    { id: "a", text: "Step A", correctPosition: 1, dependencies: [], isFlexible: false, explanation: "" },
    { id: "b", text: "Step B", correctPosition: 2, dependencies: ["a"], isFlexible: false, explanation: "" },
    { id: "c", text: "Step C", correctPosition: 3, dependencies: ["b"], isFlexible: false, explanation: "" },
    { id: "d", text: "Step D", correctPosition: 4, dependencies: ["c"], isFlexible: false, explanation: "" },
  ];
}

describe("computeSequentialAccuracy", () => {
  it("returns 100 for correct order", () => {
    expect(computeSequentialAccuracy(makeSteps(), ["a", "b", "c", "d"])).toBe(100);
  });

  it("returns 0 when every dependency is violated", () => {
    expect(computeSequentialAccuracy(makeSteps(), ["d", "c", "b", "a"])).toBe(0);
  });

  it("returns partial score for partial correct ordering", () => {
    // a→b ok, b→c violated (c before b in user order), c→d ok
    const score = computeSequentialAccuracy(makeSteps(), ["a", "c", "b", "d"]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("returns 100 when there are no dependency constraints", () => {
    const noDeps: SequentialStepSpec[] = [
      { id: "x", text: "X", correctPosition: 1, dependencies: [], isFlexible: false, explanation: "" },
      { id: "y", text: "Y", correctPosition: 2, dependencies: [], isFlexible: false, explanation: "" },
    ];
    expect(computeSequentialAccuracy(noDeps, ["y", "x"])).toBe(100);
  });

  it("excludes flexible-to-flexible edges from scoring", () => {
    const steps: SequentialStepSpec[] = [
      { id: "a", text: "A", correctPosition: 1, dependencies: [], isFlexible: true, explanation: "" },
      { id: "b", text: "B", correctPosition: 2, dependencies: ["a"], isFlexible: true, explanation: "" },
    ];
    expect(computeSequentialAccuracy(steps, ["b", "a"])).toBe(100);
  });

  it("counts flexible→rigid dependency as rigid", () => {
    const steps: SequentialStepSpec[] = [
      { id: "a", text: "A", correctPosition: 1, dependencies: [], isFlexible: true, explanation: "" },
      { id: "b", text: "B", correctPosition: 2, dependencies: ["a"], isFlexible: false, explanation: "" },
    ];
    expect(computeSequentialAccuracy(steps, ["a", "b"])).toBe(100);
    expect(computeSequentialAccuracy(steps, ["b", "a"])).toBe(0);
  });

  it("handles unknown step ids gracefully", () => {
    const score = computeSequentialAccuracy(makeSteps(), ["a", "b", "unknown", "c", "d"]);
    expect(score).toBe(100);
  });
});

describe("computeSequentialTriageAccuracy", () => {
  function makeTriageSteps(): SequentialStepSpec[] {
    return [
      { id: "a", text: "A", correctPosition: 1, dependencies: [], isFlexible: false, explanation: "", severity: "critical" },
      { id: "b", text: "B", correctPosition: 2, dependencies: ["a"], isFlexible: false, explanation: "", severity: "critical" },
      { id: "c", text: "C", correctPosition: 3, dependencies: ["b"], isFlexible: false, explanation: "", severity: "minor" },
      { id: "d", text: "D", correctPosition: 4, dependencies: ["c"], isFlexible: false, explanation: "", severity: "minor" },
    ];
  }

  it("returns 100 for a fully correct order", () => {
    expect(computeSequentialTriageAccuracy(makeTriageSteps(), ["a", "b", "c", "d"])).toBe(100);
  });

  it("returns 0 when every dependency is violated", () => {
    expect(computeSequentialTriageAccuracy(makeTriageSteps(), ["d", "c", "b", "a"])).toBe(0);
  });

  it("weights a violated critical-severity edge more than a violated minor-severity edge", () => {
    const steps = makeTriageSteps();
    // Violate only the critical a->b edge (b before a); c->d stays correct.
    const criticalViolation = computeSequentialTriageAccuracy(steps, ["b", "a", "c", "d"]);
    // Violate only the minor c->d edge (d before c); a->b stays correct.
    const minorViolation = computeSequentialTriageAccuracy(steps, ["a", "b", "d", "c"]);
    expect(criticalViolation).toBeLessThan(minorViolation);
  });

  it("defaults missing severity to minor weight and returns 100 with no dependency constraints", () => {
    const noDeps: SequentialStepSpec[] = [
      { id: "x", text: "X", correctPosition: 1, dependencies: [], isFlexible: false, explanation: "" },
      { id: "y", text: "Y", correctPosition: 2, dependencies: [], isFlexible: false, explanation: "" },
    ];
    expect(computeSequentialTriageAccuracy(noDeps, ["y", "x"])).toBe(100);
  });
});
