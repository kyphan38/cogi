import { describe, expect, it } from "vitest";
import {
  parseSystemsExerciseJson,
  sanitizeSystemsNodesInPlace,
  validateSystemsExerciseSemantics,
  validateGeopoliticsSystemsSemantics,
  isGeopoliticsSystemsPayload,
  type SystemsExercisePayload,
  type GeopoliticsSystemsExercisePayload,
} from "./systems";

function makeNodes() {
  return [
    { id: "node_1" as const, label: "Economy", description: "National economy", x: 20, y: 20 },
    { id: "node_2" as const, label: "Military", description: "Armed forces", x: 50, y: 20 },
    { id: "node_3" as const, label: "Trade", description: "International trade", x: 80, y: 20 },
    { id: "node_4" as const, label: "Diplomacy", description: "Foreign relations", x: 20, y: 60 },
    { id: "node_5" as const, label: "Tech", description: "Technology sector", x: 50, y: 60 },
    { id: "node_6" as const, label: "Energy", description: "Energy supply", x: 80, y: 60 },
  ];
}

const validPayload = {
  title: "Geopolitical System",
  scenario: "Analyze regional dynamics",
  nodes: makeNodes(),
  intendedConnections: [
    { from: "node_1" as const, to: "node_2" as const, type: "depends_on" as const, explanation: "Funding" },
    { from: "node_3" as const, to: "node_1" as const, type: "enables" as const, explanation: "Revenue" },
  ],
  shockEvent: {
    description: "Trade embargo",
    directlyAffected: ["node_3" as const],
    indirectlyAffected: ["node_1" as const],
    explanation: "Disrupts supply chains",
  },
};

describe("sanitizeSystemsNodesInPlace", () => {
  it("clips oversized labels to 20 chars", () => {
    const o = { nodes: [{ label: "a".repeat(30), description: "ok" }] };
    sanitizeSystemsNodesInPlace(o);
    expect(o.nodes[0].label).toHaveLength(20);
  });

  it("clips oversized descriptions to 50 chars", () => {
    const o = { nodes: [{ label: "ok", description: "b".repeat(60) }] };
    sanitizeSystemsNodesInPlace(o);
    expect(o.nodes[0].description).toHaveLength(50);
  });

  it("leaves valid strings unchanged", () => {
    const o = { nodes: [{ label: "Fine", description: "Also fine" }] };
    sanitizeSystemsNodesInPlace(o);
    expect(o.nodes[0].label).toBe("Fine");
  });

  it("handles non-object input gracefully", () => {
    expect(() => sanitizeSystemsNodesInPlace(null)).not.toThrow();
    expect(() => sanitizeSystemsNodesInPlace("string")).not.toThrow();
    expect(() => sanitizeSystemsNodesInPlace({ noNodes: true })).not.toThrow();
  });
});

describe("parseSystemsExerciseJson", () => {
  it("parses valid standard payload", () => {
    const result = parseSystemsExerciseJson(JSON.stringify(validPayload));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.nodes).toHaveLength(6);
  });

  it("strips markdown fences", () => {
    const fenced = "```json\n" + JSON.stringify(validPayload) + "\n```";
    expect(parseSystemsExerciseJson(fenced).success).toBe(true);
  });

  it("fails on invalid JSON", () => {
    const result = parseSystemsExerciseJson("nope");
    expect(result.success).toBe(false);
  });

  it("fails when nodes count != 6", () => {
    const bad = { ...validPayload, nodes: validPayload.nodes.slice(0, 4) };
    expect(parseSystemsExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("fails with invalid node id", () => {
    const bad = { ...validPayload, nodes: validPayload.nodes.map((n, i) => (i === 0 ? { ...n, id: "bad_id" } : n)) };
    expect(parseSystemsExerciseJson(JSON.stringify(bad)).success).toBe(false);
  });

  it("clips oversized labels before validation", () => {
    const oversized = { ...validPayload, nodes: validPayload.nodes.map((n) => ({ ...n, label: "x".repeat(30) })) };
    const result = parseSystemsExerciseJson(JSON.stringify(oversized));
    expect(result.success).toBe(true);
  });

  it("detects geopolitics variant", () => {
    const geo = {
      ...validPayload,
      perspectiveAName: "US",
      perspectiveBName: "China",
      intendedConnectionsB: [{ from: "node_1", to: "node_3", type: "risks", explanation: "Competition" }],
      shockEventB: { directlyAffected: ["node_2"], indirectlyAffected: ["node_5"], explanation: "Escalation" },
    };
    const result = parseSystemsExerciseJson(JSON.stringify(geo));
    expect(result.success).toBe(true);
    if (result.success) expect(isGeopoliticsSystemsPayload(result.data)).toBe(true);
  });
});

describe("validateSystemsExerciseSemantics", () => {
  it("returns no errors for valid payload", () => {
    expect(validateSystemsExerciseSemantics(validPayload as SystemsExercisePayload)).toEqual([]);
  });

  it("catches nodes too close together", () => {
    const close = { ...validPayload, nodes: makeNodes().map((n) => ({ ...n, x: 50, y: 50 })) };
    const errors = validateSystemsExerciseSemantics(close as SystemsExercisePayload);
    expect(errors.some((e) => e.includes("too close"))).toBe(true);
  });

  it("catches duplicate connection pairs", () => {
    const dup = {
      ...validPayload,
      intendedConnections: [
        { from: "node_1" as const, to: "node_2" as const, type: "depends_on" as const, explanation: "A" },
        { from: "node_1" as const, to: "node_2" as const, type: "enables" as const, explanation: "B" },
      ],
    };
    const errors = validateSystemsExerciseSemantics(dup as SystemsExercisePayload);
    expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("catches invalid shock node references", () => {
    const bad = {
      ...validPayload,
      shockEvent: { ...validPayload.shockEvent, directlyAffected: ["node_99" as never] },
    };
    const errors = validateSystemsExerciseSemantics(bad as SystemsExercisePayload);
    expect(errors.some((e) => e.includes("unknown node"))).toBe(true);
  });
});

describe("validateGeopoliticsSystemsSemantics", () => {
  const geoPayload: GeopoliticsSystemsExercisePayload = {
    ...validPayload,
    perspectiveAName: "United States",
    perspectiveBName: "China",
    intendedConnectionsB: [
      { from: "node_1" as const, to: "node_3" as const, type: "risks" as const, explanation: "Competition" },
      { from: "node_3" as const, to: "node_1" as const, type: "depends_on" as const, explanation: "Cycle" },
    ],
    shockEventB: { directlyAffected: ["node_2" as const], indirectlyAffected: ["node_5" as const], explanation: "Esc" },
  } as GeopoliticsSystemsExercisePayload;

  it("catches same perspective names", () => {
    const bad = { ...geoPayload, perspectiveBName: "United States" };
    const errors = validateGeopoliticsSystemsSemantics(bad as GeopoliticsSystemsExercisePayload);
    expect(errors.some((e) => e.includes("must differ"))).toBe(true);
  });

  it("catches missing intendedConnectionsB", () => {
    const bad = { ...geoPayload, intendedConnectionsB: [] };
    const errors = validateGeopoliticsSystemsSemantics(bad as GeopoliticsSystemsExercisePayload);
    expect(errors.some((e) => e.includes("intendedConnectionsB"))).toBe(true);
  });

  it("catches missing feedback loop in connections", () => {
    const noLoop = {
      ...geoPayload,
      intendedConnections: [
        { from: "node_1" as const, to: "node_2" as const, type: "depends_on" as const, explanation: "Linear" },
      ],
    };
    const errors = validateGeopoliticsSystemsSemantics(noLoop as GeopoliticsSystemsExercisePayload);
    expect(errors.some((e) => e.includes("feedback loop"))).toBe(true);
  });

  it("passes with feedback loops in both connection sets", () => {
    const withLoops = {
      ...geoPayload,
      intendedConnections: [
        { from: "node_1" as const, to: "node_2" as const, type: "depends_on" as const, explanation: "A" },
        { from: "node_2" as const, to: "node_1" as const, type: "enables" as const, explanation: "B" },
      ],
    };
    const errors = validateGeopoliticsSystemsSemantics(withLoops as GeopoliticsSystemsExercisePayload);
    expect(errors.filter((e) => e.includes("feedback loop"))).toEqual([]);
  });
});
