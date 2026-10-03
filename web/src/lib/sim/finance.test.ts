import { describe, expect, it } from "vitest";
import {
  formatVnd,
  importPriceVnd,
  loanMonthlyPayment,
  loanTotalInterest,
  relativeChange,
  savingsVsInflation,
} from "./finance";

describe("loan", () => {
  it("matches the annuity formula", () => {
    // 1,000,000 at 12% a year over 1 year: 88,848.79 a month.
    expect(loanMonthlyPayment(1_000_000, 0.12, 1)).toBeCloseTo(88_848.79, 1);
    expect(loanMonthlyPayment(1_200, 0, 1)).toBe(100);
  });

  it("a 50% higher rate raises the payment by less than 50% on a 20-year loan", () => {
    const low = loanMonthlyPayment(2e9, 0.08, 20);
    const high = loanMonthlyPayment(2e9, 0.12, 20);
    expect(relativeChange(low, high)).toBeGreaterThan(0.2);
    expect(relativeChange(low, high)).toBeLessThan(0.5);
    expect(loanTotalInterest(2e9, 0.12, 20)).toBeGreaterThan(loanTotalInterest(2e9, 0.08, 20));
  });
});

describe("savingsVsInflation", () => {
  it("loses buying power when inflation beats the savings rate", () => {
    const rows = savingsVsInflation(100, 0.05, 0.06, 10);
    expect(rows).toHaveLength(11);
    expect(rows[10]!.nominal).toBeCloseTo(162.89, 2);
    expect(rows[10]!.real).toBeLessThan(100);
  });
});

describe("import price", () => {
  it("multiplies price, exchange rate and tariff", () => {
    expect(importPriceVnd(1000, 25_000, 0.1)).toBeCloseTo(27_500_000, 2);
    const before = importPriceVnd(1000, 25_000, 0.05);
    const after = importPriceVnd(1000, 27_500, 0.15);
    expect(relativeChange(before, after)).toBeCloseTo(0.2048, 3);
  });
});

describe("formatVnd", () => {
  it("uses billion and million", () => {
    expect(formatVnd(2.5e9)).toBe("2.5 billion VND");
    expect(formatVnd(15_300_000)).toBe("15.3 million VND");
    expect(formatVnd(900)).toBe("900 VND");
  });
});
