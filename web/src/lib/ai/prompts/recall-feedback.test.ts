import { describe, expect, it } from "vitest";
import { buildRecallFeedbackPrompt } from "./recall-feedback";

describe("buildRecallFeedbackPrompt", () => {
  const input = {
    exerciseTitle: "NATO Expansion Analysis",
    summary: "Examined Russia's security concerns vs Baltic state sovereignty.",
    userRecall: "Russia sees NATO as a threat to its sphere of influence.",
  };

  it("includes exercise title", () => {
    expect(buildRecallFeedbackPrompt(input)).toContain("NATO Expansion Analysis");
  });

  it("includes summary", () => {
    expect(buildRecallFeedbackPrompt(input)).toContain("Russia's security concerns");
  });

  it("includes user recall", () => {
    expect(buildRecallFeedbackPrompt(input)).toContain("Russia sees NATO as a threat");
  });

  it("mentions word limit and format", () => {
    const result = buildRecallFeedbackPrompt(input);
    expect(result).toContain("120 words");
    expect(result).toContain("plain text");
  });
});
