import { describe, expect, it } from "vitest";
import {
  hasVietnamese,
  parseAnalyticalDeepDiveJson,
  stripVietnameseGlosses,
  validateAnalyticalDeepDive,
} from "./deep-dive";

const good = {
  core: "It forces a choice between two extremes.",
  examples: ["One partner pays off a student loan.", "One partner runs a small business."],
  alsoCalled: [{ name: "Non sequitur", note: "The conclusion does not follow." }],
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

  it("rejects a name that repeats a tag or the subtype, ignoring a bracketed part", () => {
    const d = { ...good, alsoCalled: [{ name: "False Dilemma (either-or)", note: "n" }, { name: "Hidden assumption", note: "n" }] };
    expect(validateAnalyticalDeepDive(d, { kind: "issue", blockedNames })).toHaveLength(2);
  });

  it("rejects any Vietnamese word, in any field", () => {
    const d = { ...good, core: "This is a False dilemma (song đề sai)." };
    expect(validateAnalyticalDeepDive(d, { kind: "issue", blockedNames })).toEqual([
      "Write English only: remove every Vietnamese word",
    ]);
    expect(validateAnalyticalDeepDive({ ...good, alsoCalled: [], fairer: "Tài khoản riêng." }, { kind: "decoy", blockedNames })).toHaveLength(1);
  });

  it("requires no other names for a sound statement", () => {
    expect(validateAnalyticalDeepDive(good, { kind: "decoy", blockedNames })).toHaveLength(1);
    expect(validateAnalyticalDeepDive({ ...good, alsoCalled: [] }, { kind: "decoy", blockedNames })).toEqual([]);
  });
});

describe("Vietnamese helpers", () => {
  it("detects Vietnamese letters but not plain English or French accents", () => {
    expect(hasVietnamese("kết luận không tất suy")).toBe(true);
    expect(hasVietnamese("đ")).toBe(true);
    expect(hasVietnamese("A café near the office")).toBe(false);
  });

  it("drops only bracketed Vietnamese glosses from saved text", () => {
    expect(stripVietnameseGlosses("This is a False dilemma (song đề sai), because...")).toBe("This is a False dilemma, because...");
    expect(stripVietnameseGlosses("Non sequitur (kết luận không tất suy)")).toBe("Non sequitur");
    expect(stripVietnameseGlosses("Costs rose (by 7%) last year.")).toBe("Costs rose (by 7%) last year.");
  });
});
