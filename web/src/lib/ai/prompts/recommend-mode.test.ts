import { describe, expect, it } from "vitest";
import { buildRecommendModePrompt } from "./recommend-mode";
import { PRACTICE_EXERCISE_TYPES } from "@/lib/exercise/exercise-mode-cards";

describe("buildRecommendModePrompt", () => {
  it("interpolates the topic and lists every exercise mode in the app", () => {
    const prompt = buildRecommendModePrompt("DevOps blue-green deployments");
    expect(prompt).toContain('Topic: "DevOps blue-green deployments"');
    for (const mode of PRACTICE_EXERCISE_TYPES) expect(prompt).toContain(`- ${mode}:`);
  });

  it("asks for one ranked {mode, reason} object per mode", () => {
    const prompt = buildRecommendModePrompt("finance");
    expect(prompt).toContain(`Return a JSON array of exactly ${PRACTICE_EXERCISE_TYPES.length} objects`);
    expect(prompt).toContain('"mode"');
    expect(prompt).toContain('"reason"');
  });

  it("adds the catalog group as a hint for a catalog domain only", () => {
    expect(buildRecommendModePrompt("Perfectionism & self-criticism")).toContain('"Mind & emotions" group');
    expect(buildRecommendModePrompt("my own odd topic")).not.toContain("Hint:");
  });
});
