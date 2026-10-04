import { describe, expect, it } from "vitest";
import { hasCrisisLanguage } from "./reframe-safety";

describe("hasCrisisLanguage", () => {
  it("catches clear crisis words", () => {
    for (const text of [
      "Sometimes I think about suicide.",
      "I want to die after this.",
      "I thought about killing myself.",
      "I keep hurting myself when I fail.",
      "Maybe they are better off without me.",
      "I just want to end it all.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(true);
    }
  });

  it("does not flag everyday setbacks", () => {
    for (const text of [
      "My boss criticized my report in front of the team, and I felt embarrassed.",
      "I failed the driving test and I feel stupid.",
      "The deadline is killing me this week.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(false);
    }
  });
});
