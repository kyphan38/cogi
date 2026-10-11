import { describe, expect, it } from "vitest";
import { buildLookAheadCase } from "@/lib/ai/prompts/systems-shock-perspective";
import type { SystemsNodeSpec } from "@/lib/types/exercise";

const nodes = [
  { id: "node_1", label: "Road Capacity", description: "", x: 10, y: 10 },
  { id: "node_2", label: "Car Usage", description: "", x: 50, y: 50 },
  { id: "node_3", label: "Traffic Jam", description: "", x: 90, y: 90 },
] as SystemsNodeSpec[];

describe("buildLookAheadCase", () => {
  it("shows the picked loop with its kind, the model's loops, the pattern and the answers", () => {
    const text = buildLookAheadCase({
      nodes,
      intendedConnections: [
        { from: "node_1", to: "node_2", type: "increases", explanation: "" },
        { from: "node_2", to: "node_3", type: "increases", explanation: "" },
        { from: "node_3", to: "node_1", type: "increases", explanation: "" },
      ],
      userEdges: [
        { id: "a", source: "node_2", target: "node_3", type: "increases" },
        { id: "b", source: "node_3", target: "node_2", type: "decreases" },
      ],
      lookAhead: { loop: ["node_2", "node_3"], forecast: "Jams come back.", fix: "Bus lanes." },
      archetype: { id: "fixes_that_fail", howItShows: "New roads bring more cars." },
    });
    expect(text).toContain("look_ahead");
    expect(text).toContain("Key loop the user picked: Car Usage -> Traffic Jam -> Car Usage (balancing)");
    expect(text).toContain("Road Capacity -> Car Usage -> Traffic Jam -> Road Capacity (reinforcing)");
    expect(text).toContain("Fixes that fail");
    expect(text).toContain('"Bus lanes."');
  });

  it("says when no loop was picked", () => {
    const text = buildLookAheadCase({
      nodes,
      intendedConnections: [],
      userEdges: [],
      lookAhead: { loop: null, forecast: "x", fix: "y" },
    });
    expect(text).toContain("(none picked)");
    expect(text).toContain("Model's loops: (none)");
  });
});
