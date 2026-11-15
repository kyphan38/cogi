import { describe, expect, it } from "vitest";
import { learnerFor } from "@/lib/ai/prompts/learner";
import { buildJudgmentGenerationPrompt } from "@/lib/ai/prompts/judgment";
import { buildReframeGenerationPrompt } from "@/lib/ai/prompts/reframe";
import { buildStrategyGenerationPrompt } from "@/lib/ai/prompts/strategy";
import { JUDGMENT_LEVELS } from "@/lib/exercise/judgment-levels";
import { REFRAME_LEVELS } from "@/lib/exercise/reframe-levels";
import { STRATEGY_LEVELS } from "@/lib/exercise/strategy-levels";
import { PRACTICE_LEVELS } from "@/lib/exercise/levels";

describe("learnerFor", () => {
  it("calls only Guided learners beginners", () => {
    expect(learnerFor("guided")).toContain("beginner");
    expect(learnerFor("standard")).not.toContain("beginner");
    expect(learnerFor("expert")).not.toContain("beginner");
    expect(learnerFor(undefined)).toBe("a learner");
  });
});

describe("level configs carry their own id", () => {
  it.each(PRACTICE_LEVELS)("%s", (lv) => {
    expect(JUDGMENT_LEVELS[lv].id).toBe(lv);
    expect(REFRAME_LEVELS[lv].id).toBe(lv);
    expect(STRATEGY_LEVELS[lv].id).toBe(lv);
  });
});

describe("generation prompts name the learner by level", () => {
  const prompts = (lv: (typeof PRACTICE_LEVELS)[number]) => [
    buildJudgmentGenerationPrompt({ area: "work", context: "general", level: JUDGMENT_LEVELS[lv] }),
    buildReframeGenerationPrompt({ area: "work", context: "general", level: REFRAME_LEVELS[lv] }),
    buildStrategyGenerationPrompt({ area: "work", level: STRATEGY_LEVELS[lv] }),
  ];

  it("Guided says beginner", () => {
    for (const p of prompts("guided")) expect(p).toContain("a beginner");
  });

  it("Expert never says beginner", () => {
    for (const p of prompts("expert")) {
      expect(p).toContain("Expert level");
      expect(p).not.toMatch(/beginner/i);
    }
  });
});
