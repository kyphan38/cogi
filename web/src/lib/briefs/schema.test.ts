import { describe, expect, it } from "vitest";
import { briefErrors, briefPractiseHref, briefsThisMonth, parseBriefJson, type BriefContent } from "./schema";

const brief: BriefContent = {
  title: "Port strike ends",
  background: "Dock workers and port owners signed a deal after two weeks.",
  facts: [1, 2, 3, 4].map((i) => ({ text: `Fact ${i}`, source: "Example News, 3 Nov 2026" })),
  views: [
    { name: "Workers", text: "The deal protects jobs." },
    { name: "Owners", text: "The deal raises costs." },
  ],
  checks: [0, 1, 2].map((i) => ({ question: `Q${i}`, options: ["a", "b", "c"], answerIndex: i, explanation: "because" })),
  practise: [
    { type: "analytical", domain: "Port strike news" },
    { type: "systems", domain: "Shipping delays" },
  ],
};

describe("briefs", () => {
  it("parses a full brief and rejects a short one", () => {
    expect(parseBriefJson(JSON.stringify(brief)).success).toBe(true);
    expect(parseBriefJson("```json\n" + JSON.stringify(brief) + "\n```").success).toBe(true);
    expect(parseBriefJson(JSON.stringify({ ...brief, facts: brief.facts.slice(0, 2) })).success).toBe(false);
    expect(parseBriefJson("nope").success).toBe(false);
  });

  it("checks language and the check questions", () => {
    expect(briefErrors(brief)).toEqual([]);
    expect(briefErrors({ ...brief, title: "Cảng đình công" })).toContain("write in English only");
    const sameSpot = { ...brief, checks: brief.checks.map((c) => ({ ...c, answerIndex: 0 })) };
    expect(briefErrors(sameSpot)[0]).toMatch(/same position/);
    const twin = { ...brief, checks: [{ ...brief.checks[0]!, options: ["a", "A ", "c"] }, brief.checks[1]!, brief.checks[2]!] };
    expect(briefErrors(twin)[0]).toMatch(/three different/);
  });

  it("counts this month's briefs and links to practice", () => {
    const list = [{ createdAt: "2026-11-02T10:00:00" }, { createdAt: "2026-11-15T10:00:00" }, { createdAt: "2026-10-30T10:00:00" }];
    expect(briefsThisMonth(list, "2026-11-16")).toBe(2);
    expect(briefPractiseHref(brief.practise[0]!)).toBe("/exercise/analytical?domain=Port%20strike%20news");
  });
});
