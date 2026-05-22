import { describe, expect, it } from "vitest";
import { stripUndefinedDeep } from "./strip-undefined-deep";

describe("stripUndefinedDeep", () => {
  it("passes through primitives", () => {
    expect(stripUndefinedDeep("hello")).toBe("hello");
    expect(stripUndefinedDeep(42)).toBe(42);
    expect(stripUndefinedDeep(true)).toBe(true);
    expect(stripUndefinedDeep(0)).toBe(0);
    expect(stripUndefinedDeep("")).toBe("");
  });

  it("preserves null", () => {
    expect(stripUndefinedDeep(null)).toBeNull();
  });

  it("preserves undefined at top level", () => {
    expect(stripUndefinedDeep(undefined)).toBeUndefined();
  });

  it("preserves Date instances", () => {
    const d = new Date("2025-01-01");
    expect(stripUndefinedDeep(d)).toBe(d);
  });

  it("removes undefined keys from objects", () => {
    const input = { a: 1, b: undefined, c: "ok" };
    expect(stripUndefinedDeep(input)).toEqual({ a: 1, c: "ok" });
  });

  it("preserves null values in objects", () => {
    const input = { a: null, b: 2 };
    expect(stripUndefinedDeep(input)).toEqual({ a: null, b: 2 });
  });

  it("removes undefined elements from arrays", () => {
    const input = [1, undefined, 3];
    expect(stripUndefinedDeep(input)).toEqual([1, 3]);
  });

  it("handles nested objects recursively", () => {
    const input = {
      top: "ok",
      nested: { keep: 1, drop: undefined, deeper: { also_drop: undefined, also_keep: "yes" } },
    };
    expect(stripUndefinedDeep(input)).toEqual({
      top: "ok",
      nested: { keep: 1, deeper: { also_keep: "yes" } },
    });
  });

  it("handles nested arrays in objects", () => {
    const input = { items: [{ a: 1, b: undefined }, { c: undefined }] };
    expect(stripUndefinedDeep(input)).toEqual({ items: [{ a: 1 }, {}] });
  });

  it("handles empty object and array", () => {
    expect(stripUndefinedDeep({})).toEqual({});
    expect(stripUndefinedDeep([])).toEqual([]);
  });

  it("handles deeply nested mixed structure", () => {
    const input = {
      a: [{ b: undefined, c: [undefined, { d: null, e: undefined }] }],
      f: undefined,
    };
    expect(stripUndefinedDeep(input)).toEqual({
      a: [{ c: [{ d: null }] }],
    });
  });
});
