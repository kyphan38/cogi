import { describe, expect, it } from "vitest";
import { computeSystemsAccuracy } from "./calibration-systems";
import type {
  SystemsIntendedConnection,
  SystemsShockEvent,
  SystemsUserEdge,
  SystemsNodeImpact,
} from "@/lib/types/exercise";

function makeInput(overrides: Partial<{
  intendedConnections: SystemsIntendedConnection[];
  userEdges: SystemsUserEdge[];
  shock: SystemsShockEvent;
  nodeImpact: Record<string, SystemsNodeImpact>;
}> = {}) {
  return {
    intendedConnections: [
      { from: "n1", to: "n2", type: "depends_on" as const, explanation: "" },
      { from: "n2", to: "n3", type: "depends_on" as const, explanation: "" },
    ],
    userEdges: [],
    shock: {
      description: "Shock event",
      directlyAffected: ["n1"],
      indirectlyAffected: ["n2", "n3"],
      explanation: "",
    },
    nodeImpact: {} as Record<string, SystemsNodeImpact>,
    ...overrides,
  };
}

describe("computeSystemsAccuracy", () => {
  it("returns 0 when no intended connections exist", () => {
    expect(computeSystemsAccuracy(makeInput({ intendedConnections: [] }))).toBe(0);
  });

  it("returns 0 when user draws no matching edges", () => {
    expect(computeSystemsAccuracy(makeInput())).toBe(0);
  });

  it("returns 50 when half the intended edges are matched", () => {
    const userEdges: SystemsUserEdge[] = [
      { id: "e1", source: "n1", target: "n2", type: "depends_on" },
    ];
    expect(computeSystemsAccuracy(makeInput({ userEdges }))).toBe(50);
  });

  it("returns 100 when all intended edges are matched", () => {
    const userEdges: SystemsUserEdge[] = [
      { id: "e1", source: "n1", target: "n2", type: "depends_on" },
      { id: "e2", source: "n2", target: "n3", type: "depends_on" },
    ];
    expect(computeSystemsAccuracy(makeInput({ userEdges }))).toBe(100);
  });

  it("adds shock bonus when direct and indirect sets match", () => {
    const userEdges: SystemsUserEdge[] = [
      { id: "e1", source: "n1", target: "n2", type: "depends_on" },
    ];
    const nodeImpact: Record<string, SystemsNodeImpact> = {
      n1: "direct",
      n2: "indirect",
      n3: "indirect",
    };
    const score = computeSystemsAccuracy(makeInput({ userEdges, nodeImpact }));
    expect(score).toBe(60); // 50 base + 10 shock bonus
  });

  it("does not add shock bonus when direct sets differ", () => {
    const userEdges: SystemsUserEdge[] = [
      { id: "e1", source: "n1", target: "n2", type: "depends_on" },
    ];
    const nodeImpact: Record<string, SystemsNodeImpact> = {
      n1: "direct",
      n2: "direct", // wrong - should be indirect
      n3: "indirect",
    };
    const score = computeSystemsAccuracy(makeInput({ userEdges, nodeImpact }));
    expect(score).toBe(50); // no shock bonus
  });

  it("caps at 100 even with shock bonus", () => {
    const userEdges: SystemsUserEdge[] = [
      { id: "e1", source: "n1", target: "n2", type: "depends_on" },
      { id: "e2", source: "n2", target: "n3", type: "depends_on" },
    ];
    const nodeImpact: Record<string, SystemsNodeImpact> = {
      n1: "direct",
      n2: "indirect",
      n3: "indirect",
    };
    const score = computeSystemsAccuracy(makeInput({ userEdges, nodeImpact }));
    expect(score).toBe(100);
  });

  it("caps user edges at 20 for matching", () => {
    const manyEdges: SystemsUserEdge[] = Array.from({ length: 25 }, (_, i) => ({
      id: `e${i}`,
      source: `x${i}`,
      target: `y${i}`,
      type: "depends_on" as const,
    }));
    manyEdges.push({ id: "real", source: "n1", target: "n2", type: "depends_on" });
    const score = computeSystemsAccuracy(makeInput({ userEdges: manyEdges }));
    // The matching edge is at index 25, past the EDGE_BUDGET of 20
    expect(score).toBe(0);
  });

  it("does not match edges with wrong type", () => {
    const userEdges: SystemsUserEdge[] = [
      { id: "e1", source: "n1", target: "n2", type: "influences" },
    ];
    expect(computeSystemsAccuracy(makeInput({ userEdges }))).toBe(0);
  });
});
