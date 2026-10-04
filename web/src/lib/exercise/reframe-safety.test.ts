import { describe, expect, it } from "vitest";
import { hasCrisisLanguage } from "./reframe-safety";

describe("hasCrisisLanguage", () => {
  it("catches clear crisis words in English and Vietnamese", () => {
    for (const text of [
      "Sometimes I think about suicide.",
      "I want to die after this.",
      "I thought about killing myself.",
      "I keep hurting myself when I fail.",
      "Maybe they are better off without me.",
      "I just want to end it all.",
      "Toi nghi den chuyen tu sat",
      "Tôi muốn chết sau chuyện này.",
      "Có lúc tôi không muốn sống nữa.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(true);
    }
  });

  it("does not flag everyday setbacks", () => {
    for (const text of [
      "My boss criticized my report in front of the team, and I felt embarrassed.",
      "I failed the driving test and I feel stupid.",
      "The deadline is killing me this week.",
      "Tôi bị sếp phê bình trước cả nhóm.",
      "Làm thêm cả tuần, mệt muốn chết.",
      "Cu tu tu roi se on.",
    ]) {
      expect(hasCrisisLanguage(text), text).toBe(false);
    }
  });
});
