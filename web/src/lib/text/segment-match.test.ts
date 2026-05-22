import { describe, expect, it } from "vitest";
import { findSegmentRange, repairTextSegment } from "./segment-match";

const PASSAGE =
  "The government’s new tariff policy will stabilize supply chains " +
  "and protect domestic manufacturing. Critics argue that tariffs increase " +
  "consumer prices, but supporters believe the long-term benefits outweigh " +
  "short-term costs. Recent data shows a 15% increase in local production.";

describe("findSegmentRange", () => {
  it("returns exact match range", () => {
    const seg = "Critics argue that tariffs increase consumer prices";
    const range = findSegmentRange(PASSAGE, seg);
    expect(range).not.toBeNull();
    expect(PASSAGE.slice(range![0], range![1])).toBe(seg);
  });

  it("returns null for empty segment", () => {
    expect(findSegmentRange(PASSAGE, "")).toBeNull();
    expect(findSegmentRange(PASSAGE, "   ")).toBeNull();
  });

  it("returns null when segment is not in passage", () => {
    expect(findSegmentRange(PASSAGE, "quantum entanglement theorem")).toBeNull();
  });

  it("handles curly quote normalization", () => {
    const seg = "The government's new tariff policy";
    const range = findSegmentRange(PASSAGE, seg);
    expect(range).not.toBeNull();
    expect(range![0]).toBe(0);
  });

  it("handles em-dash normalization", () => {
    const passage = "The plan—bold as it was—failed.";
    const seg = "The plan-bold as it was-failed.";
    const range = findSegmentRange(passage, seg);
    expect(range).not.toBeNull();
  });

  it("handles extra whitespace normalization", () => {
    const seg = "Critics  argue   that tariffs increase consumer prices";
    const range = findSegmentRange(PASSAGE, seg);
    expect(range).not.toBeNull();
  });

  it("uses fuzzy window search for long approximate segments", () => {
    const seg =
      "Critics argue that tariffs increase consumer prices but supporters believe " +
      "the long-term benefits outweigh the short-term costs";
    const range = findSegmentRange(PASSAGE, seg);
    expect(range).not.toBeNull();
  });

  it("skips window search for very short segments", () => {
    expect(findSegmentRange(PASSAGE, "xyz abc")).toBeNull();
  });
});

describe("repairTextSegment", () => {
  it("returns the passage slice when match is found", () => {
    const repaired = repairTextSegment(PASSAGE, "Critics argue that tariffs increase consumer prices");
    expect(repaired).toBe("Critics argue that tariffs increase consumer prices");
  });

  it("returns original segment when no match is found", () => {
    const seg = "unrelated text not in passage";
    expect(repairTextSegment(PASSAGE, seg)).toBe(seg);
  });
});
