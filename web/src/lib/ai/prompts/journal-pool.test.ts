import { describe, expect, it } from "vitest";
import {
  pickJournalPrompts,
  JOURNAL_PROMPTS,
  MISS_AWARE_PROMPTS,
  type JournalPromptContext,
} from "./journal-pool";

describe("pickJournalPrompts", () => {
  it("returns exactly 3 prompts", () => {
    const result = pickJournalPrompts(new Set());
    expect(result).toHaveLength(3);
  });

  it("excludes prompts in the excluded set", () => {
    const excluded = new Set(JOURNAL_PROMPTS.slice(0, 9).map((p) => p.id));
    const result = pickJournalPrompts(excluded);
    for (const pick of result) {
      expect(excluded.has(pick.id)).toBe(false);
    }
  });

  it("resets when too few prompts remain", () => {
    const allIds = new Set(JOURNAL_PROMPTS.map((p) => p.id));
    const result = pickJournalPrompts(allIds);
    expect(result).toHaveLength(3);
  });

  it("includes a miss-aware prompt when context triggers it", () => {
    const context: JournalPromptContext = {
      exerciseType: "analytical",
      missedIssueTypes: ["hidden_assumption"],
    };
    const result = pickJournalPrompts(new Set(), context);
    expect(result).toHaveLength(3);
    const missPrompt = result.find((p) => p.id === "p_miss_assumption");
    expect(missPrompt).toBeDefined();
  });

  it("includes overconfident prompt when flagged", () => {
    const context: JournalPromptContext = {
      exerciseType: "analytical",
      overconfident: true,
    };
    const result = pickJournalPrompts(new Set(), context);
    const hasOverconfident = result.some((p) => p.id === "p_overconfident");
    expect(hasOverconfident).toBe(true);
  });

  it("includes underconfident prompt when flagged", () => {
    const context: JournalPromptContext = {
      exerciseType: "analytical",
      underconfident: true,
    };
    const result = pickJournalPrompts(new Set(), context);
    const hasUnderconfident = result.some((p) => p.id === "p_underconfident");
    expect(hasUnderconfident).toBe(true);
  });

  it("includes sequential miss prompt for low-accuracy sequential", () => {
    const context: JournalPromptContext = {
      exerciseType: "sequential",
      accuracy: 50,
    };
    const result = pickJournalPrompts(new Set(), context);
    const has = result.some((p) => p.id === "p_miss_dependency");
    expect(has).toBe(true);
  });

  it("does not include sequential miss prompt for high accuracy", () => {
    const context: JournalPromptContext = {
      exerciseType: "sequential",
      accuracy: 90,
    };
    const result = pickJournalPrompts(new Set(), context);
    const has = result.some((p) => p.id === "p_miss_dependency");
    expect(has).toBe(false);
  });

  it("skips excluded miss-aware prompts", () => {
    const context: JournalPromptContext = {
      exerciseType: "analytical",
      missedIssueTypes: ["hidden_assumption"],
    };
    const result = pickJournalPrompts(new Set(["p_miss_assumption"]), context);
    expect(result).toHaveLength(3);
    expect(result.some((p) => p.id === "p_miss_assumption")).toBe(false);
  });

  it("returns unique prompt ids", () => {
    const result = pickJournalPrompts(new Set());
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("MISS_AWARE_PROMPTS conditions", () => {
  it("weak_evidence condition triggers correctly", () => {
    const match = MISS_AWARE_PROMPTS.find((m) => m.prompt.id === "p_miss_evidence");
    expect(match).toBeDefined();
    expect(match!.condition({ exerciseType: "analytical", missedIssueTypes: ["weak_evidence"] })).toBe(true);
    expect(match!.condition({ exerciseType: "analytical", missedIssueTypes: ["bias"] })).toBe(false);
  });

  it("systems ripple condition triggers for low accuracy", () => {
    const match = MISS_AWARE_PROMPTS.find((m) => m.prompt.id === "p_miss_ripple");
    expect(match).toBeDefined();
    expect(match!.condition({ exerciseType: "systems", accuracy: 50 })).toBe(true);
    expect(match!.condition({ exerciseType: "systems", accuracy: 80 })).toBe(false);
    expect(match!.condition({ exerciseType: "analytical", accuracy: 50 })).toBe(false);
  });
});
