import { describe, expect, it } from "vitest";
import { timingSafeEqualString } from "./timing-safe-equal";

describe("timingSafeEqualString", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqualString("secret", "secret")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(timingSafeEqualString("abcdef", "abcdeg")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqualString("short", "longer")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeEqualString("", "")).toBe(true);
  });

  it("returns false when one string is empty", () => {
    expect(timingSafeEqualString("a", "")).toBe(false);
    expect(timingSafeEqualString("", "a")).toBe(false);
  });

  it("handles unicode strings", () => {
    expect(timingSafeEqualString("café", "café")).toBe(true);
    expect(timingSafeEqualString("café", "cafë")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(timingSafeEqualString("Token", "token")).toBe(false);
  });
});
