import { describe, expect, it } from "vitest";
import { leavingItems, reducedMotion, rowChanges } from "./motion";

const a = { id: "a" };
const b = { id: "b" };
const c = { id: "c" };

describe("reducedMotion", () => {
  it("is true in Node, where matchMedia does not exist", () => {
    expect(reducedMotion()).toBe(true);
  });
});

describe("leavingItems", () => {
  it("a removed item is leaving", () => {
    expect(leavingItems([a, b, c], [a, c])).toEqual([b]);
  });
  it("the same list leaves nothing", () => {
    expect(leavingItems([a, b], [a, b])).toEqual([]);
  });
  it("a new item is not leaving", () => {
    expect(leavingItems([a], [a, b])).toEqual([]);
  });
  it("works with number ids", () => {
    expect(leavingItems([{ id: 1 }, { id: 2 }], [{ id: 2 }])).toEqual([{ id: 1 }]);
  });
});

describe("rowChanges", () => {
  it("one added row", () => {
    expect(rowChanges(["a", "b"], ["c", "a", "b"])).toEqual({ added: ["c"], removed: [] });
  });
  it("one removed row", () => {
    expect(rowChanges(["a", "b", "c"], ["a", "c"])).toEqual({ added: [], removed: ["b"] });
  });
  it("nothing changed", () => {
    expect(rowChanges(["a", "b"], ["b", "a"])).toEqual({ added: [], removed: [] });
  });
  it("a swapped list is not an edit", () => {
    expect(rowChanges(["a", "b", "c"], ["x", "y", "z"])).toBeNull();
  });
  it("the limit can be raised", () => {
    expect(rowChanges([], ["a", "b", "c", "d"], 5)).toEqual({
      added: ["a", "b", "c", "d"],
      removed: [],
    });
  });
});
