import { describe, expect, it } from "vitest";
import type { SystemsIntendedConnection, SystemsNodeSpec, SystemsUserEdge } from "@/lib/types/exercise";
import { rateSystems, sameLink, scoreSystems, soundLinks, systemsCoachingRefs, withFairExtras } from "./systems-score";

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
    // Only nodes someone marks as affected count: node_1 right; node_2 and node_3 not.
    expect([r.impactsCorrect, r.impactsTotal]).toEqual([1, 3]);
  });

  it("does not reward a blank map, but counts a wrongly marked untouched node", () => {
    expect([score([]).impactsCorrect, score([]).impactsTotal]).toEqual([0, 3]);
    const r = score([], { node_1: "direct", node_2: "indirect", node_3: "indirect", node_6: "indirect" });
    expect([r.impactsCorrect, r.impactsTotal]).toEqual([3, 4]);
  });

  it("counts the same meaning drawn another way as exact", () => {
    // Model: node_1 depends on node_2. "node_2 enables node_1" says the same.
    const r = score([edge("a", "node_2", "node_1", "enables"), edge("b", "node_3", "node_2", "depends_on")]);
    expect(r.connections.slice(0, 2).map((c) => [c.found, c.direction, c.exact])).toEqual([
      [true, "same", true],
      [true, "same", true],
    ]);
    expect(sameLink({ from: "a", to: "b", type: "conflicts_with" }, { from: "b", to: "a", type: "conflicts_with" })).toBe(true);
    expect(sameLink({ from: "a", to: "b", type: "risks" }, { from: "b", to: "a", type: "risks" })).toBe(false);
    expect(sameLink({ from: "a", to: "b", type: "depends_on" }, { from: "a", to: "b", type: "enables" })).toBe(false);
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
    // 2 of 3 connections, 1 of 3 affected nodes: (0.67 + 0.33) / 2 = 0.5.
    const some = score([edge("a", "node_1", "node_2", "depends_on"), edge("b", "node_2", "node_3", "enables")], { node_1: "direct" });
    expect(rateSystems(some)).toBe("ok");
    // No connections, no affected node marked: 0.
    expect(rateSystems(score([], {}))).toBe("poor");
  });
});

describe("scoreSystems - how the shock spreads", () => {
  it("accepts a path through an affected node the model links to", () => {
    // Model: node_1 direct, node_2 and node_3 indirect; links 1-2 and 2-3.
    const r = scoreSystems({
      nodes, intendedConnections: intended, shockEvent: shock, userEdges: [],
      nodeImpact: { node_1: "direct", node_2: "indirect", node_3: "indirect" },
      impactVia: { node_2: "node_1", node_3: "node_1" },
    });
    expect(r.spread).toEqual([
      { nodeId: "node_2", via: "node_1", possibleVia: ["node_1", "node_3"], correct: true },
      { nodeId: "node_3", via: "node_1", possibleVia: ["node_2"], correct: false },
    ]);
    expect(systemsCoachingRefs(r).required).toContain("via_node_3");
  });

  it("ignores paths for nodes the user did not mark indirect", () => {
    const r = scoreSystems({
      nodes, intendedConnections: intended, shockEvent: shock, userEdges: [],
      nodeImpact: { node_2: "direct" }, impactVia: { node_2: "node_1" },
    });
    expect(r.spread).toEqual([]);
  });
});

describe("fair extra links", () => {
  const base = {
    connections: [],
    extraEdgeIds: ["e1", "e2"],
    impacts: [],
    connectionsFound: 1,
    connectionsExact: 1,
    connectionsTotal: 4,
    impactsCorrect: 2,
    impactsTotal: 2,
  };

  it("keeps only extra refs judged fair, mapped to edge ids", () => {
    const r = withFairExtras(base, [
      { ref: "extra_1", fair: true },
      { ref: "extra_2", fair: false },
      { ref: "conn_1", fair: true },
    ]);
    expect(r.extraFairIds).toEqual(["e1"]);
    expect(soundLinks(r)).toEqual({ sound: 2, total: 5 });
  });

  it("a fair extra link raises the rating", () => {
    const fair = withFairExtras(base, [
      { ref: "extra_1", fair: true },
      { ref: "extra_2", fair: true },
    ]);
    // Without: (1/4 + 1) / 2 = 0.625 (ok). With 2 fair: (3/6 + 1) / 2 = 0.75 (good).
    expect(rateSystems(base)).toBe("ok");
    expect(rateSystems(fair)).toBe("good");
  });
});
