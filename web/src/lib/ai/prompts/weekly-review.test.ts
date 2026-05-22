import { describe, expect, it } from "vitest";
import { buildWeeklyReviewPrompt } from "./weekly-review";
import type { WeeklyReviewClientPayload } from "@/lib/insights/build-weekly-review-payload";

const emptyPayload: WeeklyReviewClientPayload = {
  exercises: [],
  decisions: [],
  actions: [],
  emotionHistogram: {},
  perspectiveDisagreementCount: 0,
};

const fullPayload: WeeklyReviewClientPayload = {
  exercises: [
    { type: "analytical", domain: "economics", title: "GDP Analysis", completedAt: "2025-01-01",
      summary: "Passage about GDP growth", aiPerspectiveSnippet: "Good analysis", journalBlob: "I learned..." },
    { type: "sequential", domain: "tech", title: "Deploy Pipeline", completedAt: "2025-01-02",
      summary: "Step ordering exercise", aiPerspectiveSnippet: "", journalBlob: "" },
  ],
  decisions: [
    { text: "Switch to microservices", domain: "architecture", followUpNoteFilled: true },
  ],
  actions: [
    { exerciseTitle: "GDP Analysis", oneAction: "Review quarterly data", createdAt: "2025-01-01" },
  ],
  emotionHistogram: { anxious: 1, confident: 2 },
  perspectiveDisagreementCount: 3,
};

describe("buildWeeklyReviewPrompt", () => {
  it("includes required markdown section headers", () => {
    const result = buildWeeklyReviewPrompt(fullPayload);
    expect(result).toContain("## This week's patterns");
    expect(result).toContain("## Your calibration");
    expect(result).toContain("## Recurring blind spot");
    expect(result).toContain("## Suggested focus for next week");
  });

  it("renders exercise blocks", () => {
    const result = buildWeeklyReviewPrompt(fullPayload);
    expect(result).toContain("### Exercise 1");
    expect(result).toContain("GDP Analysis");
    expect(result).toContain("- type: analytical");
    expect(result).toContain("- domain: economics");
  });

  it("renders decision blocks", () => {
    const result = buildWeeklyReviewPrompt(fullPayload);
    expect(result).toContain("### Decision 1");
    expect(result).toContain("Switch to microservices");
    expect(result).toContain("followUpNoteFilled: true");
  });

  it("renders action blocks", () => {
    const result = buildWeeklyReviewPrompt(fullPayload);
    expect(result).toContain("### Action 1");
    expect(result).toContain("Review quarterly data");
  });

  it("renders emotion histogram", () => {
    const result = buildWeeklyReviewPrompt(fullPayload);
    expect(result).toContain('"anxious":1');
  });

  it("renders disagreement count", () => {
    const result = buildWeeklyReviewPrompt(fullPayload);
    expect(result).toContain("3");
  });

  it("handles empty payload gracefully", () => {
    const result = buildWeeklyReviewPrompt(emptyPayload);
    expect(result).toContain("(none)");
    expect(result.length).toBeGreaterThan(100);
  });

  it("shows (none) for empty ai perspective snippet", () => {
    const result = buildWeeklyReviewPrompt(fullPayload);
    expect(result).toContain("(none)");
  });
});
