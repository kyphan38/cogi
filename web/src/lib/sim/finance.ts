/**
 * Exact money maths for the simulators (PLAN-learning.md L4). These are formulas,
 * not forecasts: a loan payment, compound growth, inflation, an import price.
 */

/** Monthly payment of a fixed-rate loan (annuity formula). `annualRate` as 0.08 for 8%. */
export function loanMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  const i = annualRate / 12;
  if (i === 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

/** Total interest paid over the life of the loan. */
export function loanTotalInterest(principal: number, annualRate: number, years: number): number {
  return loanMonthlyPayment(principal, annualRate, years) * Math.round(years * 12) - principal;
}

/**
 * A lump sum saved at `savingsRate` while prices rise at `inflation`, year by year:
 * the nominal balance, and what it can buy in today's money (real value).
 */
export function savingsVsInflation(
  amount: number,
  savingsRate: number,
  inflation: number,
  years: number,
): { year: number; nominal: number; real: number }[] {
  return Array.from({ length: years + 1 }, (_, year) => {
    const nominal = amount * Math.pow(1 + savingsRate, year);
    return { year, nominal, real: nominal / Math.pow(1 + inflation, year) };
  });
}

/** Shop price in VND of a good bought in USD: price x exchange rate x (1 + tariff). */
export function importPriceVnd(priceUsd: number, vndPerUsd: number, tariff: number): number {
  return priceUsd * vndPerUsd * (1 + tariff);
}

/** Relative change from a to b, e.g. 0.2 for +20%. */
export function relativeChange(a: number, b: number): number {
  return a === 0 ? 0 : b / a - 1;
}

export function formatVnd(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} billion VND`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })} million VND`;
  return `${Math.round(v).toLocaleString("en-US")} VND`;
}

export function formatPercent(v: number, digits = 1): string {
  return `${(v * 100).toLocaleString("en-US", { maximumFractionDigits: digits })}%`;
}
