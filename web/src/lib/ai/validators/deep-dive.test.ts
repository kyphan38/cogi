import { describe, expect, it } from "vitest";
import {
  hasVietnamese,
  parseAnalyticalDeepDiveJson,
  stripVietnameseGlosses,
  validateAnalyticalDeepDive,
} from "./deep-dive";

const good = {
  core: "It forces a choice between two extremes. Separate accounts do not show a lack of trust.",
  examples: ["One partner pays off a student loan.", "One partner runs a small business."],
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

  it("drops an old alsoCalled field instead of keeping it", () => {
    const r = parseAnalyticalDeepDiveJson(JSON.stringify({ ...good, alsoCalled: [{ name: "x", note: "y" }] }));
    expect(r.success && "alsoCalled" in r.data).toBe(false);
  });
});

describe("validateAnalyticalDeepDive", () => {
  it("passes an English reply", () => {
    expect(validateAnalyticalDeepDive(good)).toEqual([]);
  });

  it("rejects any Vietnamese word, in any field", () => {
    expect(validateAnalyticalDeepDive({ ...good, core: "This is a False dilemma (song đề sai)." })).toEqual([
      "Write English only: remove every Vietnamese word",
    ]);
    expect(validateAnalyticalDeepDive({ ...good, fairer: "Tài khoản riêng." })).toHaveLength(1);
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
    expect(stripVietnameseGlosses("Costs rose (by 7%) last year.")).toBe("Costs rose (by 7%) last year.");
  });
});
