import { describe, expect, it } from "vitest";
import { catalogGroupOf, isExerciseCatalogDomain } from "./exercise-domain-catalog";
import { isRealWorldTopic, REAL_WORLD_CATALOG_DOMAINS } from "./real-world-topics";
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
