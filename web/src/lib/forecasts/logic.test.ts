import { describe, expect, it } from "vitest";
import { brierScore, brierWord, dueForecasts, forecastBuckets, forecastInputError, openForecasts, resolvedForecasts, type Forecast } from "./logic";

const f = (id: string, probability: number, dueDay: string, outcome: Forecast["outcome"] = null): Forecast => ({
  id,
  question: id,
  probability,
  dueDay,
  createdAt: "2026-10-01T00:00:00Z",
  outcome,
  resolvedAt: outcome ? `${dueDay}T10:00:00Z` : null,
});

describe("forecastInputError", () => {
  const ok = { question: "Rain on Friday", probability: 70, dueDay: "2026-11-20" };
  it("accepts a full forecast and explains what is missing", () => {
    expect(forecastInputError(ok, "2026-11-16")).toBeNull();
    expect(forecastInputError({ ...ok, question: " " }, "2026-11-16")).toMatch(/expect/);
    expect(forecastInputError({ ...ok, probability: 100 }, "2026-11-16")).toMatch(/1 to 99/);
    expect(forecastInputError({ ...ok, probability: 55.5 }, "2026-11-16")).toMatch(/1 to 99/);
    expect(forecastInputError({ ...ok, dueDay: "" }, "2026-11-16")).toMatch(/day/);
    expect(forecastInputError({ ...ok, dueDay: "2026-11-16" }, "2026-11-16")).toMatch(/after today/);
  });
});

describe("lists", () => {
  const all = [f("later", 60, "2026-12-01"), f("due2", 60, "2026-11-16"), f("due1", 60, "2026-11-01"), f("done", 60, "2026-10-10", "yes")];
  it("splits due, open and resolved", () => {
    expect(dueForecasts(all, "2026-11-16").map((x) => x.id)).toEqual(["due1", "due2"]);
    expect(openForecasts(all, "2026-11-16").map((x) => x.id)).toEqual(["later"]);
    expect(resolvedForecasts(all).map((x) => x.id)).toEqual(["done"]);
  });
});

describe("scores", () => {
  it("gives the Brier score, or null with nothing resolved", () => {
    expect(brierScore([f("a", 70, "2026-12-01")])).toBeNull();
    // (0.9-1)^2 = 0.01 and (0.2-0)^2 = 0.04
    expect(brierScore([f("a", 90, "2026-10-01", "yes"), f("b", 20, "2026-10-02", "no")])).toBeCloseTo(0.025);
    expect(brierScore([f("a", 50, "2026-10-01", "yes")])).toBeCloseTo(0.25);
  });

  it("groups resolved forecasts by the chance given", () => {
    const all = [f("a", 70, "2026-10-01", "yes"), f("b", 75, "2026-10-02", "no"), f("c", 99, "2026-10-03", "yes"), f("d", 10, "2026-12-01")];
    expect(forecastBuckets(all)).toEqual([
      { from: 60, to: 80, count: 2, happened: 1, said: 73 },
      { from: 80, to: 100, count: 1, happened: 1, said: 99 },
    ]);
  });

  it("names the score", () => {
    expect(brierWord(0.05)).toBe("very good");
    expect(brierWord(0.3)).toBe("no better than guessing 50%");
  });
});
