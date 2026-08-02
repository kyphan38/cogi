import { describe, expect, it } from "vitest";
import { buildTopicSuggestionsPrompt } from "./topic-suggestions";

describe("buildTopicSuggestionsPrompt - exercise kind", () => {
  it("interpolates the area and its mode description", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "analytical",
      kind: "exercise",
      excludeTitles: [],
    });

    expect(prompt).toContain('Exercise mode: "analytical"');
    expect(prompt).toContain("spotting flawed reasoning");
  });

  it("falls back to the raw area string when there's no known description", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "unknown_area",
      kind: "exercise",
      excludeTitles: [],
    });

    expect(prompt).toContain('Exercise mode: "unknown_area" - unknown_area');
  });

  it("renders '(none yet)' when excludeTitles is empty", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "analytical",
      kind: "exercise",
      excludeTitles: [],
    });

    expect(prompt).toContain("(none yet)");
  });

  it("renders each excluded title as a bullet", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "analytical",
      kind: "exercise",
      excludeTitles: ["Topic A", "Topic B"],
    });

    expect(prompt).toContain("- Topic A");
    expect(prompt).toContain("- Topic B");
    expect(prompt).not.toContain("(none yet)");
  });

  it("includes userContext when provided, omits the block when absent", () => {
    const withCtx = buildTopicSuggestionsPrompt({
      area: "analytical",
      kind: "exercise",
      excludeTitles: [],
      userContext: "senior analyst",
    });
    expect(withCtx).toContain("[USER CONTEXT]");
    expect(withCtx).toContain("senior analyst");

    const withoutCtx = buildTopicSuggestionsPrompt({
      area: "analytical",
      kind: "exercise",
      excludeTitles: [],
    });
    expect(withoutCtx).not.toContain("[USER CONTEXT]");
  });

  it("asks for exactly 5 JSON objects with title and blurb, no markdown fences", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "analytical",
      kind: "exercise",
      excludeTitles: [],
    });

    expect(prompt).toContain("Return a JSON array of exactly 5 objects");
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"blurb"');
    expect(prompt).toContain("no markdown fences, no prose");
  });
});

describe("buildTopicSuggestionsPrompt - math kind", () => {
  it("interpolates the topic area and its math description", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "expected_value",
      kind: "math",
      excludeTitles: [],
    });

    expect(prompt).toContain('Topic area: "expected_value"');
    expect(prompt).toContain("probability-weighted costs and payoffs");
  });

  it("includes example titles drawn from the expected-value catalog", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "expected_value",
      kind: "math",
      excludeTitles: [],
    });

    expect(prompt).toContain("Existing scenario titles for calibration on tone/specificity");
  });

  it("shares the same exclude-list and userContext rendering as the exercise branch", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "game_theory",
      kind: "math",
      excludeTitles: ["Prior Scenario"],
      userContext: "beginner",
    });

    expect(prompt).toContain("[TOPICS ALREADY PRACTICED - DO NOT SUGGEST THESE OR CLOSE VARIANTS]");
    expect(prompt).toContain("- Prior Scenario");
    expect(prompt).toContain("[USER CONTEXT]");
    expect(prompt).toContain("beginner");
  });

  it("asks for exactly 5 JSON objects with title and blurb, no markdown fences", () => {
    const prompt = buildTopicSuggestionsPrompt({
      area: "expected_value",
      kind: "math",
      excludeTitles: [],
    });

    expect(prompt).toContain("Return a JSON array of exactly 5 objects");
    expect(prompt).toContain('"title"');
    expect(prompt).toContain('"blurb"');
    expect(prompt).toContain("no markdown fences, no prose");
  });
});
