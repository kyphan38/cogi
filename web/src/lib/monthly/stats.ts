import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { scoreSummary } from "@/lib/exercise/score-summary";
import { weakSpots } from "@/lib/exercise/weak-spots";
import type { Exercise } from "@/lib/types/exercise";

/**
 * Monthly review: the numbers of one month, counted in code. The AI only puts
 * them into words; it does not judge.
 */
export type Trend = "up" | "flat" | "down" | "new";

export interface MonthTypeStat {
  type: string;
  label: string;
  count: number;
  /** Mean score 0-100, or null when this type has nothing to count. */
  score: number | null;
  prevCount: number;
  prevScore: number | null;
  trend: Trend | null;
}

export interface MonthStats {
  /** "YYYY-MM" */
  month: string;
  total: number;
  prevTotal: number;
  /** Days with at least one finished exercise. */
  activeDays: number;
  types: MonthTypeStat[];
  takeaways: string[];
  /** Answers to "Did you use it?" given for this month's exercises. */
  used: { yes: number; partly: number; no: number };
  weakSpots: string[];
}

/** Fewer finished exercises than this is too little to review. */
export const MONTH_REVIEW_MIN = 3;
/** A change in mean score smaller than this (in points) counts as flat. */
const FLAT_POINTS = 5;
const MAX_TAKEAWAYS = 12;

const localDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

export function monthOf(iso: string): string {
  return localDay(iso).slice(0, 7);
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** "2026-10" -> "October 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function meanScore(rows: Exercise[]): number | null {
  const ratios = rows.map((r) => scoreSummary(r)?.ratio).filter((v): v is number => v != null);
  return ratios.length ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) : null;
}

function trendOf(score: number | null, prev: number | null, prevCount: number): Trend | null {
  if (score === null) return null;
  if (prevCount === 0 || prev === null) return "new";
  if (score - prev >= FLAT_POINTS) return "up";
  if (prev - score >= FLAT_POINTS) return "down";
  return "flat";
}

export function monthStats(completed: Exercise[], month: string): MonthStats {
  const done = completed.filter((e) => e.completedAt);
  const inMonth = done.filter((e) => monthOf(e.completedAt!) === month);
  const before = done.filter((e) => monthOf(e.completedAt!) === previousMonth(month));

  const types: MonthTypeStat[] = [...new Set(inMonth.map((e) => e.type))]
    .map((type) => {
      const now = inMonth.filter((e) => e.type === type);
      const prev = before.filter((e) => e.type === type);
      const score = meanScore(now);
      const prevScore = meanScore(prev);
      return {
        type,
        label: TYPE_LABEL[type] ?? type,
        count: now.length,
        score,
        prevCount: prev.length,
        prevScore,
        trend: trendOf(score, prevScore, prev.length),
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const used = { yes: 0, partly: 0, no: 0 };
  const takeaways: string[] = [];
  for (const e of inMonth) {
    if ("useCheck" in e && e.useCheck) used[e.useCheck.result] += 1;
    if ("takeaway" in e && e.takeaway?.trim() && takeaways.length < MAX_TAKEAWAYS) takeaways.push(e.takeaway.trim().slice(0, 240));
  }

  return {
    month,
    total: inMonth.length,
    prevTotal: before.length,
    activeDays: new Set(inMonth.map((e) => localDay(e.completedAt!))).size,
    types,
    takeaways,
    used,
    weakSpots: weakSpots(inMonth).map((s) => `${TYPE_LABEL[s.type]}: ${s.label} (missed ${s.misses} of ${s.chances})`),
  };
}

export interface MonthlyReviewText {
  headline: string;
  improved: string[];
  steady: string[];
  focus: string;
}

export interface MonthlyReview {
  month: string;
  createdAt: string;
  stats: MonthStats;
  text: MonthlyReviewText;
}

/**
 * The month a review can be written for today: the last full month, when it has
 * enough exercises and no review yet. Null otherwise.
 */
export function monthToReview(completed: Exercise[], reviews: Pick<MonthlyReview, "month">[], today: string): string | null {
  const month = previousMonth(today.slice(0, 7));
  if (reviews.some((r) => r.month === month)) return null;
  const count = completed.filter((e) => e.completedAt && monthOf(e.completedAt) === month).length;
  return count >= MONTH_REVIEW_MIN ? month : null;
}

export const TREND_WORD: Record<Trend, string> = { up: "up", flat: "steady", down: "down", new: "new this month" };
