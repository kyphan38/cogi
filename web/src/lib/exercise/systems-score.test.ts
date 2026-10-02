import { describe, expect, it } from "vitest";
import type { SystemsIntendedConnection, SystemsNodeSpec, SystemsUserEdge } from "@/lib/types/exercise";
import { rateSystems, scoreSystems, systemsCoachingRefs } from "./systems-score";

const nodes = (["node_1", "node_2", "node_3", "node_4", "node_5", "node_6"] as const).map(
  (id) => ({ id, label: id, description: "d", x: 50, y: 50 }),
) as SystemsNodeSpec[];
const intended: SystemsIntendedConnection[] = [
  { from: "node_1", to: "node_2", type: "depends_on", explanation: "e" },
  { from: "node_2", to: "node_3", type: "enables", explanation: "e" },
  { from: "node_4", to: "node_5", type: "risks", explanation: "e" },
];
const shock = { description: "s", directlyAffected: ["node_1"], indirectlyAffected: ["node_2", "node_3"], explanation: "e" } as never;
const edge = (id: string, source: string, target: string, type: SystemsUserEdge["type"]): SystemsUserEdge => ({ id, source, target, type });

function score(userEdges: SystemsUserEdge[], nodeImpact: Record<string, "none" | "direct" | "indirect"> = {}) {
  return scoreSystems({ nodes, intendedConnections: intended, shockEvent: shock, userEdges, nodeImpact });
}

describe("scoreSystems", () => {
  it("matches connections by node pair, noting reversed direction and type", () => {
    const r = score([
      edge("a", "node_1", "node_2", "depends_on"),
      edge("b", "node_3", "node_2", "enables"),
      edge("c", "node_5", "node_6", "risks"),
    ]);
    expect(r.connections.map((c) => [c.found, c.direction, c.exact])).toEqual([
      [true, "same", true],
      [true, "reversed", false],
      [false, null, false],
    ]);
    expect(r.extraEdgeIds).toEqual(["c"]);
    expect([r.connectionsFound, r.connectionsExact, r.connectionsTotal]).toEqual([2, 1, 3]);
  });

  it("compares each node's impact with the shock", () => {
    const r = score([], { node_1: "direct", node_2: "direct", node_6: "none" });
    expect(r.impacts.find((i) => i.nodeId === "node_2")).toMatchObject({ expected: "indirect", user: "direct", correct: false });
    // Unmarked nodes count as "none".
    expect(r.impacts.find((i) => i.nodeId === "node_4")).toMatchObject({ expected: "none", user: "none", correct: true });
    expect(r.impactsCorrect).toBe(4);
  });

  it("requires coaching for wrong nodes, missed or reversed connections and extras", () => {
    const r = score([edge("b", "node_3", "node_2", "enables"), edge("c", "node_5", "node_6", "risks")], { node_1: "direct" });
    const refs = systemsCoachingRefs(r);
    expect(refs.required).toEqual(["node_node_2", "node_node_3", "conn_1", "conn_2", "conn_3", "extra_1"]);
    expect(refs.allowed).toContain("node_node_4");
  });
});

describe("rateSystems", () => {
  it("averages connections and impact", () => {
    const all = score(
      [edge("a", "node_1", "node_2", "depends_on"), edge("b", "node_2", "node_3", "enables"), edge("c", "node_4", "node_5", "risks")],
      { node_1: "direct", node_2: "indirect", node_3: "indirect" },
    );
    expect(rateSystems(all)).toBe("good");
    // 2 of 3 connections, 3 of 6 nodes: (0.67 + 0.5) / 2 = 0.58.
    const some = score([edge("a", "node_1", "node_2", "depends_on"), edge("b", "node_2", "node_3", "enables")], {});
    expect(rateSystems(some)).toBe("ok");
    // No connections, 3 of 6 nodes: (0 + 0.5) / 2 = 0.25.
    expect(rateSystems(score([], {}))).toBe("poor");
  });
});
