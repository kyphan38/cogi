import { describe, expect, it } from "vitest";
import { parseAnalyticalDeepDiveJson, validateAnalyticalDeepDive } from "./deep-dive";

const good = {
  core: "It forces a choice between two extremes.",
  examples: ["One partner pays off a student loan.", "One partner runs a small business."],
  alsoCalled: [{ name: "Non sequitur (kết luận không tất suy)", note: "The conclusion does not follow." }],
  fairer: "Some couples keep separate accounts for practical reasons.",
};

describe("parseAnalyticalDeepDiveJson", () => {
  it("accepts a valid reply, with or without code fences", () => {
    expect(parseAnalyticalDeepDiveJson(JSON.stringify(good))).toEqual({ success: true, data: good });
    expect(parseAnalyticalDeepDiveJson("```json\n" + JSON.stringify(good) + "\n```").success).toBe(true);
  });

  it("rejects bad JSON and too few or too many examples", () => {
    expect(parseAnalyticalDeepDiveJson("not json").success).toBe(false);
    expect(parseAnalyticalDeepDiveJson(JSON.stringify({ ...good, examples: ["one"] })).success).toBe(false);
    expect(parseAnalyticalDeepDiveJson(JSON.stringify({ ...good, examples: ["a", "b", "c", "d", "e"] })).success).toBe(false);
  });
});

describe("validateAnalyticalDeepDive", () => {
  const blockedNames = ["Logical Fallacy", "Hidden Assumption", "False dilemma"];

  it("passes a fresh name for an issue", () => {
    expect(validateAnalyticalDeepDive(good, { kind: "issue", blockedNames })).toEqual([]);
  });

  it("rejects a name that repeats a tag or the subtype, ignoring the Vietnamese part", () => {
    const d = { ...good, alsoCalled: [{ name: "False Dilemma (song đề sai)", note: "n" }, { name: "Hidden assumption", note: "n" }] };
    expect(validateAnalyticalDeepDive(d, { kind: "issue", blockedNames })).toHaveLength(2);
  });

  it("requires no other names for a sound statement", () => {
    expect(validateAnalyticalDeepDive(good, { kind: "decoy", blockedNames })).toHaveLength(1);
    expect(validateAnalyticalDeepDive({ ...good, alsoCalled: [] }, { kind: "decoy", blockedNames })).toEqual([]);
  });
});
