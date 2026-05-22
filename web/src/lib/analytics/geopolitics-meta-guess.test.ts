import { describe, expect, it } from "vitest";
import { computeMetaGuessScore } from "./geopolitics-meta-guess";

describe("computeMetaGuessScore", () => {
  it("returns 0 for completely unrelated guesses", () => {
    const score = computeMetaGuessScore(
      "Western interventionist perspective",
      ["local militia leaders", "tribal elders"],
      "quantum physics theory",
      ["Albert Einstein"],
    );
    expect(score).toBe(0);
  });

  it("gives perspective score for matching tokens", () => {
    const score = computeMetaGuessScore(
      "Western interventionist perspective",
      [],
      "Western interventionist view",
      [],
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(70);
  });

  it("gives actor score for matching actor names", () => {
    const score = computeMetaGuessScore(
      "Some perspective",
      ["local militia leaders"],
      "",
      ["militia leaders"],
    );
    expect(score).toBeGreaterThan(0);
  });

  it("caps perspective at 70 and actor at 30, total at 100", () => {
    const score = computeMetaGuessScore(
      "Western interventionist perspective focusing on stability",
      ["local militia leaders", "tribal elders", "women activists"],
      "Western interventionist perspective focusing on stability and peace",
      ["local militia leaders", "tribal elders", "women activists"],
    );
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 0 for empty guesses", () => {
    expect(computeMetaGuessScore("hidden", ["actor"], "", [])).toBe(0);
  });

  it("matches actors case-insensitively", () => {
    const score = computeMetaGuessScore(
      "perspective",
      ["Local Leaders"],
      "",
      ["local leaders"],
    );
    expect(score).toBeGreaterThan(0);
  });

  it("matches partial actor names via substring", () => {
    const score = computeMetaGuessScore(
      "perspective",
      ["local militia leaders"],
      "",
      ["militia"],
    );
    expect(score).toBeGreaterThan(0);
  });
});
