import { describe, expect, it } from "vitest";
import type { EmbeddedIssue, ValidPoint } from "@/lib/types/exercise";
import { guidedCandidates, shuffledOrder } from "./guided-candidates";

const passage = "S1 plain one. S2 has the issue here. S3 plain two. S4 is a trap. S5 plain three. S6 plain four.";
const issue: EmbeddedIssue = { description: "d", type: "bias", severity: "obvious", textSegment: "has the issue", explanation: "e" };
const trap: ValidPoint = { textSegment: "is a trap", explanation: "e" };

function texts(seed: string) {
  return guidedCandidates({ passage, embeddedIssues: [issue], validPoints: [trap], seed }).map((r) =>
    passage.slice(r.start, r.end),
  );
}

describe("guidedCandidates", () => {
  it("includes the issue and trap sentences plus two plain ones, in passage order", () => {
    const t = texts("ex-1");
    expect(t).toHaveLength(4);
    expect(t).toContain("S2 has the issue here.");
    expect(t).toContain("S4 is a trap.");
    const order = t.map((x) => passage.indexOf(x));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("is stable for the same seed", () => {
    expect(texts("ex-1")).toEqual(texts("ex-1"));
  });

  it("does not repeat a sentence holding both an issue and a trap", () => {
    const both: ValidPoint = { textSegment: "S2 has", explanation: "e" };
    const r = guidedCandidates({ passage, embeddedIssues: [issue], validPoints: [both], seed: "x" });
    expect(new Set(r.map((x) => x.start)).size).toBe(r.length);
  });
});

describe("shuffledOrder", () => {
  it("is a stable permutation", () => {
    const o = shuffledOrder(3, "seed");
    expect([...o].sort()).toEqual([0, 1, 2]);
    expect(shuffledOrder(3, "seed")).toEqual(o);
  });

  it("does not always put the first option first", () => {
    const firsts = new Set(Array.from({ length: 20 }, (_, i) => shuffledOrder(3, `s${i}`)[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });
});
