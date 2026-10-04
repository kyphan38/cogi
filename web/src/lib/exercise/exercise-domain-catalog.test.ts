import { describe, expect, it } from "vitest";
import { EXERCISE_DOMAIN_CATALOG, catalogGroupOf } from "./exercise-domain-catalog";
import { isGeopoliticsAnalyticalDomain } from "./geopolitics-domains";
import { PRACTICE_EXERCISE_TYPES } from "./exercise-mode-cards";
import { calibrationTopicFor } from "./calibration-math";

describe("exercise domain catalog", () => {
  it("covers every exercise type with at least two groups", () => {
    for (const type of PRACTICE_EXERCISE_TYPES) {
      const groups = EXERCISE_DOMAIN_CATALOG.filter((g) => g.bestFor?.includes(type));
      expect(groups.length, type).toBeGreaterThanOrEqual(2);
    }
  });

  it("never sends a non-geopolitics domain into the geopolitics exercise by accident", () => {
    for (const g of EXERCISE_DOMAIN_CATALOG) {
      for (const d of g.domains) expect(isGeopoliticsAnalyticalDomain(d), d).toBe(false);
    }
  });

  it("has unique domains and at least 8 per group", () => {
    const all = EXERCISE_DOMAIN_CATALOG.flatMap((g) => g.domains);
    expect(new Set(all).size).toBe(all.length);
    for (const g of EXERCISE_DOMAIN_CATALOG) expect(g.domains.length, g.id).toBeGreaterThanOrEqual(8);
  });

  it("finds the group of a domain", () => {
    expect(catalogGroupOf("Couples & partners")?.id).toBe("relationships-family");
    expect(catalogGroupOf("not in the catalog")).toBeUndefined();
  });
});

describe("calibrationTopicFor", () => {
  it("maps a domain to the closest question-bank topic", () => {
    expect(calibrationTopicFor("Science")).toBe("Science");
    expect(calibrationTopicFor("Clinical trial design", "science-research")).toBe("Science");
    expect(calibrationTopicFor("Insurance choices", "personal-money")).toBe("Money & numbers");
    expect(calibrationTopicFor("Tourism in Vietnam", "vietnam")).toBe("Vietnam");
    expect(calibrationTopicFor("Middle East power dynamics", "geo-regional")).toBe("Geography");
    expect(calibrationTopicFor("Couples & partners", "relationships-family")).toBe("Mixed");
    expect(calibrationTopicFor(undefined)).toBe("Mixed");
  });
});
