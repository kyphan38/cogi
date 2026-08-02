import { describe, expect, it } from "vitest";
import { buildRecommendModePrompt } from "./recommend-mode";

describe("buildRecommendModePrompt", () => {
  it("interpolates the topic and lists all 5 exercise modes", () => {
    const prompt = buildRecommendModePrompt("DevOps blue-green deployments");

    expect(prompt).toContain('Topic: "DevOps blue-green deployments"');
    expect(prompt).toContain("- analytical:");
    expect(prompt).toContain("- sequential:");
    expect(prompt).toContain("- systems:");
    expect(prompt).toContain("- evaluative:");
    expect(prompt).toContain("- generative:");
  });

  it("asks for a ranked JSON array of exactly 5 {mode, reason} objects", () => {
    const prompt = buildRecommendModePrompt("finance");

    expect(prompt).toContain("Return a JSON array of exactly 5 objects");
    expect(prompt).toContain('"mode"');
    expect(prompt).toContain('"reason"');
  });
});
