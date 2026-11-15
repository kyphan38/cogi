import { describe, expect, it } from "vitest";
import { catalogGroupOf, isExerciseCatalogDomain } from "./exercise-domain-catalog";
import { factRuleFor, isRealWorldTopic, REAL_WORLD_CATALOG_DOMAINS } from "./real-world-topics";
import { REAL_WORLD_FACT_RULE, STORY_FACT_RULE } from "@/lib/ai/prompts/geo-rules";
import { STRATEGY_AREAS } from "./strategy-levels";
import { TRACKS } from "./tracks";

describe("isRealWorldTopic", () => {
  it("covers every US politics domain", () => {
    expect(isRealWorldTopic("Lobbying & money in US politics")).toBe(true);
    expect(isRealWorldTopic(" Homelessness in US cities ")).toBe(true);
  });

  it("covers listed single domains and steps of real-world tracks", () => {
    expect(isRealWorldTopic("Big fraud cases in Vietnam: how they worked")).toBe(true);
    const step = TRACKS.find((t) => t.id === "vietnam-economy")!.steps[0]!;
    expect(isRealWorldTopic(step.domain)).toBe(true);
  });

  it("leaves everyday topics alone", () => {
    expect(isRealWorldTopic("Couples & partners")).toBe(false);
    expect(isRealWorldTopic("Vietnamese family life & traditions")).toBe(false);
    const step = TRACKS.find((t) => t.id === "small-business")!.steps[0]!;
    expect(isRealWorldTopic(step.domain)).toBe(false);
  });

  it("lists only domains that are in the catalog", () => {
    for (const d of REAL_WORLD_CATALOG_DOMAINS) {
      expect(isExerciseCatalogDomain(d), d).toBe(true);
      expect(catalogGroupOf(d)?.id, d).not.toBe("us-politics");
    }
  });
});

describe("factRuleFor", () => {
  it("gives every topic a fact rule: strict for real institutions, general for the rest", () => {
    expect(factRuleFor("Lobbying & money in US politics")).toBe(REAL_WORLD_FACT_RULE);
    expect(factRuleFor("Couples & partners")).toBe(STORY_FACT_RULE);
    expect(factRuleFor("Elon Musk as a leader")).toBe(STORY_FACT_RULE);
  });

  it("treats the Strategy countries area as real world", () => {
    expect(STRATEGY_AREAS).toContain("Countries & trade");
    expect(factRuleFor("Countries & trade")).toBe(REAL_WORLD_FACT_RULE);
  });

  it("forbids invented claims about real names", () => {
    expect(STORY_FACT_RULE).toContain("Never invent words, actions or wrongdoing for a real, named person or company.");
  });
});
