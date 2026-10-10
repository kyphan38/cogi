import { describe, expect, it } from "vitest";
import { SYSTEMS_IDEA_GUIDE, SYSTEMS_IDEAS } from "./systems-idea-guide";
import { pickSystemsCards } from "./systems-idea-cards";
import type { SystemsResult } from "./systems-score";

const links = [
  { from: "a", to: "b", type: "depends_on" as const },
  { from: "b", to: "a", type: "enables" as const },
  { from: "c", to: "d", type: "risks" as const },
];
const conn = (index: number, exact: boolean) => ({ index, edgeId: null, direction: null, userType: null, found: exact, exact });
const impact = (expected: "none" | "direct" | "indirect", user: "none" | "direct" | "indirect") => ({ nodeId: "x", expected, user, correct: expected === user });
const result = (exact: boolean[], impacts = [impact("indirect", "indirect")]): Pick<SystemsResult, "connections" | "impacts" | "spread"> => ({
  connections: exact.map((e, i) => conn(i, e)),
  impacts,
  spread: [],
});

describe("systems idea guide", () => {
  it("covers every idea, with every field filled", () => {
    for (const k of SYSTEMS_IDEAS) {
      const g = SYSTEMS_IDEA_GUIDE[k];
      for (const v of [g.spot, g.ask, g.fix, g.othersTip, g.practice]) expect(v.trim().length, k).toBeGreaterThan(10);
      expect(g.signals.length, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("pickSystemsCards", () => {
  it("all matched: ripple effects, then feedback loops", () => {
    expect(pickSystemsCards({ intendedConnections: links, result: result([true, true, true]) })).toEqual(["ripple_effects", "feedback_loops"]);
  });

  it("a shock traced differently comes first, then the idea of a missed link (a loop first)", () => {
    const r = result([true, false, false], [impact("indirect", "none")]);
    expect(pickSystemsCards({ intendedConnections: links, result: r })).toEqual(["ripple_effects", "feedback_loops"]);
    const onlyRisk = result([true, true, false]);
    expect(pickSystemsCards({ intendedConnections: links, result: onlyRisk })).toEqual(["risks", "ripple_effects"]);
  });

  it("resilience: a missed most critical node comes first", () => {
    const r = result([true, true, true]);
    expect(pickSystemsCards({ intendedConnections: links, result: r, criticality: { topNodeId: "a", userRank: 3 } })[0]).toBe("single_points_of_failure");
    expect(pickSystemsCards({ intendedConnections: links, result: r, criticality: { topNodeId: "a", userRank: 1 } })).toEqual([
      "single_points_of_failure",
      "ripple_effects",
    ]);
  });
});
