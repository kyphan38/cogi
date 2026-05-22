import { describe, expect, it } from "vitest";
import { parseComboBundleJson } from "./combo-bundle";

function makeAnalytical() {
  return {
    title: "Analysis", passage: "Text here about the topic at hand.",
    embeddedIssues: [{ description: "I", type: "bias", severity: "obvious", textSegment: "topic at hand", explanation: "E" }],
    validPoints: [{ textSegment: "Text here", explanation: "Valid" }],
  };
}

function makeSteps() {
  return Array.from({ length: 6 }, (_, i) => ({
    id: `s${i + 1}`, text: `Step ${i + 1}`, correctPosition: i,
    dependencies: [], isFlexible: false, explanation: `Why ${i + 1}`,
  }));
}

function makeNodes() {
  return [
    { id: "node_1", label: "A", description: "Desc A", x: 20, y: 20 },
    { id: "node_2", label: "B", description: "Desc B", x: 50, y: 20 },
    { id: "node_3", label: "C", description: "Desc C", x: 80, y: 20 },
    { id: "node_4", label: "D", description: "Desc D", x: 20, y: 60 },
    { id: "node_5", label: "E", description: "Desc E", x: 50, y: 60 },
    { id: "node_6", label: "F", description: "Desc F", x: 80, y: 60 },
  ];
}

function makeSystems() {
  return {
    title: "System", scenario: "System scenario",
    nodes: makeNodes(),
    intendedConnections: [{ from: "node_1", to: "node_2", type: "depends_on", explanation: "Why" }],
    shockEvent: { description: "Shock", directlyAffected: ["node_1"], indirectlyAffected: ["node_3"], explanation: "Impact" },
  };
}

function makeEvaluativeMatrix() {
  return {
    variant: "matrix" as const,
    title: "Eval", scenario: "Evaluate options",
    axisX: { label: "X", lowLabel: "Low", highLabel: "High" },
    axisY: { label: "Y", lowLabel: "Low", highLabel: "High" },
    options: [
      { id: "o1", title: "A", description: "D", intendedQuadrant: "top-left", explanation: "E" },
      { id: "o2", title: "B", description: "D", intendedQuadrant: "top-right", explanation: "E" },
      { id: "o3", title: "C", description: "D", intendedQuadrant: "bottom-left", explanation: "E" },
      { id: "o4", title: "D", description: "D", intendedQuadrant: "bottom-right", explanation: "E" },
    ],
  };
}

function makeGenerative() {
  return {
    title: "Gen", scenario: "Write about policy",
    prompts: [
      { id: "p1", question: "Q1" }, { id: "p2", question: "Q2" },
      { id: "p3", question: "Q3" }, { id: "p4", question: "Q4" },
    ],
  };
}

describe("parseComboBundleJson", () => {
  describe("full_analysis preset", () => {
    const payload = {
      preset: "full_analysis",
      sharedTitle: "Shared Title",
      sharedScenario: "A shared scenario that is long enough to pass validation.",
      analytical: makeAnalytical(),
      systems: makeSystems(),
      evaluativeMatrix: makeEvaluativeMatrix(),
    };

    it("parses valid full_analysis", () => {
      const result = parseComboBundleJson(JSON.stringify(payload), "full_analysis");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.preset).toBe("full_analysis");
    });

    it("fails when preset doesn't match", () => {
      const result = parseComboBundleJson(JSON.stringify(payload), "decision_sprint");
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("Expected preset");
    });

    it("clips oversized system node labels", () => {
      const oversized = {
        ...payload,
        systems: { ...payload.systems, nodes: payload.systems.nodes.map((n) => ({ ...n, label: "x".repeat(30) })) },
      };
      const result = parseComboBundleJson(JSON.stringify(oversized), "full_analysis");
      expect(result.success).toBe(true);
    });
  });

  describe("decision_sprint preset", () => {
    const payload = {
      preset: "decision_sprint",
      sharedTitle: "Sprint Title",
      sharedScenario: "A decision sprint scenario long enough.",
      evaluativeMatrix: makeEvaluativeMatrix(),
      generative: makeGenerative(),
    };

    it("parses valid decision_sprint", () => {
      const result = parseComboBundleJson(JSON.stringify(payload), "decision_sprint");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.preset).toBe("decision_sprint");
    });
  });

  describe("root_cause preset", () => {
    const payload = {
      preset: "root_cause",
      sharedTitle: "Root Cause Title",
      sharedScenario: "A root cause analysis scenario that passes min length.",
      sequential: {
        title: "Seq", scenario: "Order steps",
        steps: makeSteps(),
        criticalErrors: [{ description: "Bad order", severity: "catastrophic" }],
      },
      systems: makeSystems(),
      analytical: makeAnalytical(),
    };

    it("parses valid root_cause", () => {
      const result = parseComboBundleJson(JSON.stringify(payload), "root_cause");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.preset).toBe("root_cause");
    });
  });

  it("strips markdown fences", () => {
    const payload = {
      preset: "decision_sprint",
      sharedTitle: "T",
      sharedScenario: "A scenario that is long enough to pass.",
      evaluativeMatrix: makeEvaluativeMatrix(),
      generative: makeGenerative(),
    };
    const fenced = "```json\n" + JSON.stringify(payload) + "\n```";
    expect(parseComboBundleJson(fenced, "decision_sprint").success).toBe(true);
  });

  it("fails on invalid JSON", () => {
    expect(parseComboBundleJson("not json", "full_analysis").success).toBe(false);
  });

  it("fails when sharedScenario is too short", () => {
    const payload = {
      preset: "decision_sprint",
      sharedTitle: "T",
      sharedScenario: "Short",
      evaluativeMatrix: makeEvaluativeMatrix(),
      generative: makeGenerative(),
    };
    expect(parseComboBundleJson(JSON.stringify(payload), "decision_sprint").success).toBe(false);
  });
});
