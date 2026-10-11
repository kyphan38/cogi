import { describe, expect, it } from "vitest";
import { findLoops } from "@/lib/exercise/systems-loops";

describe("findLoops", () => {
  it("finds a reinforcing loop once, whatever the start node", () => {
    const loops = findLoops([
      { from: "a", to: "b", type: "increases" },
      { from: "b", to: "c", type: "increases" },
      { from: "c", to: "a", type: "increases" },
    ]);
    expect(loops).toEqual([{ nodes: ["a", "b", "c"], kind: "reinforcing" }]);
  });

  it("an odd number of decreases makes a balancing loop", () => {
    const loops = findLoops([
      { from: "a", to: "b", type: "increases" },
      { from: "b", to: "a", type: "decreases" },
    ]);
    expect(loops[0]?.kind).toBe("balancing");
  });

  it("two decreases make a reinforcing loop", () => {
    const loops = findLoops([
      { from: "a", to: "b", type: "decreases" },
      { from: "b", to: "a", type: "decreases" },
    ]);
    expect(loops[0]?.kind).toBe("reinforcing");
  });

  it("no loop in a chain; no sign for old link types", () => {
    expect(findLoops([{ from: "a", to: "b", type: "increases" }])).toEqual([]);
    const old = findLoops([
      { from: "a", to: "b", type: "depends_on" },
      { from: "b", to: "a", type: "enables" },
    ]);
    expect(old[0]?.kind).toBeNull();
  });

  it("finds two loops that share a node, shortest first", () => {
    const loops = findLoops([
      { from: "a", to: "b", type: "increases" },
      { from: "b", to: "a", type: "decreases" },
      { from: "b", to: "c", type: "increases" },
      { from: "c", to: "d", type: "increases" },
      { from: "d", to: "b", type: "increases" },
    ]);
    expect(loops.map((l) => l.nodes.length)).toEqual([2, 3]);
  });
});
