import { describe, expect, it } from "vitest";
import { isGeopoliticsAnalyticalDomain, isGeopoliticsRelated } from "./geopolitics-domains";

describe("isGeopoliticsRelated", () => {
  it("does not match keywords inside ordinary words", () => {
    for (const domain of [
      "How to bring up a pay rise",
      "Building a bridge across the river",
      "Writing a project brief",
      "British cooking at home",
      "Choosing fabric for a sofa",
      "A swift decision at work",
      "Swiftly answering emails",
      "BRIDGE CLUB rules",
      "Brick or wood for a house",
      "Sanctioned holidays at the office",
    ]) {
      expect(isGeopoliticsRelated(domain), domain).toBe(false);
    }
  });

  it("still matches real geopolitics topics", () => {
    for (const domain of [
      "BRI loans in Africa",
      "Belt and Road projects",
      "NATO expansion",
      "nato and Russia",
      "The geopolitics of chips",
      "Geopolitical risk for investors",
      "De-dollarization in emerging markets",
      "SWIFT and sanctions",
      "Trade wars and tariffs",
      "Semiconductors in Taiwan",
      "The Strait of Hormuz",
      "Proxy wars in the region",
    ]) {
      expect(isGeopoliticsRelated(domain), domain).toBe(true);
    }
  });

  it("keeps the catalog subdomains as geopolitics", () => {
    expect(isGeopoliticsAnalyticalDomain("Infrastructure corridors, ports & megaprojects (e.g., BRI)")).toBe(true);
  });
});
