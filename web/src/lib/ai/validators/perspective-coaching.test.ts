import { describe, expect, it } from "vitest";
import { parseAnalyticalCoachingJson } from "./perspective-structured";

function reply(items: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    perspectiveFormat: "analytical_v3",
    title: "T",
    items: items.map((it) => ({ why: "w", clue: "c", nextTimeAsk: "q?", ...it })),
    takeaways: ["one"],
    ...extra,
  });
}

const refs = { requiredRefs: ["issue_1", "issue_2"], allowedRefs: ["issue_1", "issue_2", "decoy_1"] };

describe("parseAnalyticalCoachingJson", () => {
  it("accepts a reply that covers every required ref, in answer-key order", () => {
    const r = parseAnalyticalCoachingJson(reply([{ ref: "decoy_1" }, { ref: "issue_2" }, { ref: "issue_1" }]), refs);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.items.map((i) => i.ref)).toEqual(["issue_1", "issue_2", "decoy_1"]);
  });

  it("fails when a required ref is missing", () => {
    const r = parseAnalyticalCoachingJson(reply([{ ref: "issue_1" }]), refs);
    expect(r).toEqual({ success: false, error: "items missing for refs: issue_2" });
  });

  it("drops unknown and duplicate refs instead of failing", () => {
    const r = parseAnalyticalCoachingJson(
      reply([{ ref: "issue_1" }, { ref: "issue_1", why: "again" }, { ref: "issue_2" }, { ref: "issue_9" }]),
      refs,
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.items.map((i) => i.ref)).toEqual(["issue_1", "issue_2"]);
      expect(r.data.items[0]!.why).toBe("w");
    }
  });

  it("rejects the old clarity_v2 shape", () => {
    const old = JSON.stringify({ perspectiveFormat: "clarity_v2", title: "T", suitableFor: "Suitable for x", highlightCritiques: [] });
    expect(parseAnalyticalCoachingJson(old, refs).success).toBe(false);
  });

  it("needs 1-2 takeaways", () => {
    expect(parseAnalyticalCoachingJson(reply([{ ref: "issue_1" }, { ref: "issue_2" }], { takeaways: [] }), refs).success).toBe(false);
    expect(parseAnalyticalCoachingJson(reply([{ ref: "issue_1" }, { ref: "issue_2" }], { takeaways: ["a", "b", "c"] }), refs).success).toBe(false);
  });

  it("requires metaNote for geopolitics", () => {
    const r = parseAnalyticalCoachingJson(reply([{ ref: "issue_1" }, { ref: "issue_2" }]), { ...refs, requireMetaNote: true });
    expect(r).toEqual({ success: false, error: "metaNote is required for geopolitics passages" });
  });

  it("strips markdown fences", () => {
    const r = parseAnalyticalCoachingJson("```json\n" + reply([{ ref: "issue_1" }, { ref: "issue_2" }]) + "\n```", refs);
    expect(r.success).toBe(true);
  });
});
