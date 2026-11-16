import { describe, expect, it } from "vitest";
import { QUICK_SKILLS, parseQuickJson, quickEnglishErrors, quickFeedbackSchema, quickSkillFor } from "./schema";

describe("5-minute question", () => {
  it("parses a reply, with or without code fences", () => {
    const body = JSON.stringify({ strong: "a", missing: "b", nextTime: "c" });
    expect(parseQuickJson(quickFeedbackSchema, body)).toEqual({ success: true, data: { strong: "a", missing: "b", nextTime: "c" } });
    expect(parseQuickJson(quickFeedbackSchema, "```json\n" + body + "\n```").success).toBe(true);
    expect(parseQuickJson(quickFeedbackSchema, "not json")).toEqual({ success: false, error: "Invalid JSON from model" });
    expect(parseQuickJson(quickFeedbackSchema, JSON.stringify({ strong: "a" })).success).toBe(false);
  });

  it("flags Vietnamese in the app's own text", () => {
    expect(quickEnglishErrors({ strong: "Good use of evidence.", missing: "Bạn quên chi phí." })).toEqual(["missing must be in English only"]);
  });

  it("rotates the skill by day and covers every skill in a week", () => {
    const week = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"].map(quickSkillFor);
    expect(new Set(week).size).toBe(QUICK_SKILLS.length);
    expect(quickSkillFor("2026-11-16")).toBe(quickSkillFor("2026-11-23"));
  });
});
