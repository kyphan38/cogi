/**
 * Spaced review for items the user should keep (PLAN-retention.md R2). Geo Lab has
 * its own copy in lib/geo/quiz.ts; it reviews only misses, this reviews everything.
 */

/** Days until the next review at each step. A miss starts again at the first. */
export const TERM_REVIEW_INTERVALS = [1, 3, 7, 21] as const;

/** Where one item stands. `step` = TERM_REVIEW_INTERVALS.length means done; `due` is then null. */
export interface ReviewItemState {
  step: number;
  due: string | null;
}

/** Local calendar day, "YYYY-MM-DD". */
export function localDay(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** An item never reviewed: first due one interval after the day it was first met. */
export function initialState(firstSeenDay: string, intervals: readonly number[] = TERM_REVIEW_INTERVALS): ReviewItemState {
  return { step: 0, due: addDays(firstSeenDay, intervals[0]!) };
}

/** The state after one answer on `today`. */
export function nextState(
  prev: ReviewItemState,
  correct: boolean,
  today: string,
  intervals: readonly number[] = TERM_REVIEW_INTERVALS,
): ReviewItemState {
  if (!correct) return { step: 0, due: addDays(today, intervals[0]!) };
  const step = prev.step + 1;
  return step >= intervals.length ? { step: intervals.length, due: null } : { step, due: addDays(today, intervals[step]!) };
}

export type ReviewStatus = "due" | "learning" | "known";

export function reviewStatus(s: ReviewItemState, today: string): ReviewStatus {
  if (s.due == null) return "known";
  return s.due <= today ? "due" : "learning";
}
