import type { CalibrationItem } from "@/lib/exercise/calibration-math";
import type { ResultRating } from "@/lib/exercise/levels";
import { BASE_RATE_TOLERANCE, BINARY_CONFIDENCE_STEPS, VERY_WIDE_RATIO } from "@/lib/exercise/calibration-levels";

/** The user's answer to one item; which fields are set depends on the item kind. */
export interface CalibrationAnswer {
  /** Binary: the option picked. */
  choice?: 0 | 1;
  /** Binary: how sure, 50-100. */
  confidence?: number;
  /** Interval: the range. */
  low?: number;
  high?: number;
  /** Base rate: the chance, in percent. */
  estimate?: number;
}

export interface CalibrationItemOutcome {
  id: string;
  kind: CalibrationItem["kind"];
  answered: boolean;
  /** Binary: right answer. Interval: the answer is inside the range. Base rate: within tolerance. */
  correct: boolean;
  confidence?: number;
  /** Interval: the high end is more than 10 times the low end. */
  veryWide?: boolean;
  /** Interval miss: the range was too low or too high. */
  missed?: "too-low" | "too-high";
  /** Base rate: how far off, in percentage points. */
  error?: number;
}

export interface CalibrationResult {
  items: CalibrationItemOutcome[];
  binary: {
    count: number;
    right: number;
    /** Mean squared gap between confidence and result (0 = perfect, 0.25 = always saying 50%). */
    brier: number | null;
    /** Per confidence step: how many answers, how many right. */
    buckets: { confidence: number; count: number; right: number }[];
  };
  interval: { count: number; hits: number; target: number; veryWide: number };
  baseRate: { count: number; right: number };
}

export function scoreCalibration(input: {
  items: CalibrationItem[];
  answers: Partial<Record<string, CalibrationAnswer>>;
  intervalTarget: number;
}): CalibrationResult {
  const items = input.items.map((item): CalibrationItemOutcome => {
    const a = input.answers[item.id] ?? {};
    if (item.kind === "binary") {
      const answered = a.choice != null && a.confidence != null;
      return { id: item.id, kind: item.kind, answered, correct: answered && a.choice === item.answerIndex, confidence: a.confidence };
    }
    if (item.kind === "interval") {
      const answered = a.low != null && a.high != null;
      if (!answered) return { id: item.id, kind: item.kind, answered, correct: false };
      const low = Math.min(a.low!, a.high!);
      const high = Math.max(a.low!, a.high!);
      const correct = item.answer >= low && item.answer <= high;
      return {
        id: item.id,
        kind: item.kind,
        answered,
        correct,
        veryWide: low <= 0 ? high > 0 : high / low > VERY_WIDE_RATIO,
        missed: correct ? undefined : high < item.answer ? "too-low" : "too-high",
      };
    }
    const answered = a.estimate != null;
    const error = answered ? Math.abs(a.estimate! - item.answer) : undefined;
    return { id: item.id, kind: item.kind, answered, correct: error != null && error <= BASE_RATE_TOLERANCE, error };
  });

  const binary = items.filter((o) => o.kind === "binary");
  const answeredBinary = binary.filter((o) => o.answered);
  const brier =
    answeredBinary.length > 0
      ? answeredBinary.reduce((sum, o) => sum + (o.confidence! / 100 - (o.correct ? 1 : 0)) ** 2, 0) / answeredBinary.length
      : null;
  const intervals = items.filter((o) => o.kind === "interval");
  const baseRates = items.filter((o) => o.kind === "baserate");
  return {
    items,
    binary: {
      count: binary.length,
      right: binary.filter((o) => o.correct).length,
      brier: brier == null ? null : Math.round(brier * 1000) / 1000,
      buckets: BINARY_CONFIDENCE_STEPS.map((c) => {
        const at = answeredBinary.filter((o) => o.confidence === c);
        return { confidence: c, count: at.length, right: at.filter((o) => o.correct).length };
      }).filter((bk) => bk.count > 0),
    },
    interval: {
      count: intervals.length,
      hits: intervals.filter((o) => o.correct).length,
      target: input.intervalTarget,
      veryWide: intervals.filter((o) => o.veryWide).length,
    },
    baseRate: { count: baseRates.length, right: baseRates.filter((o) => o.correct).length },
  };
}

/**
 * Rate one finished exercise for level suggestions (PLAN-psychology.md P2).
 * Good: every base-rate answer right, Brier under 0.2, and a range hit rate near the
 * target (within 15 points below, any amount above) with fewer than half the ranges
 * very wide. Poor: Brier over 0.3, a hit rate under half the target, or every
 * base-rate answer wrong when there are 2 or more. Few questions per exercise, so
 * one result says little; the History chart shows the real picture.
 */
export function rateCalibration(r: CalibrationResult): ResultRating {
  const hitRate = r.interval.count > 0 ? (r.interval.hits / r.interval.count) * 100 : null;
  const poor =
    (r.binary.brier != null && r.binary.brier > 0.3) ||
    (hitRate != null && hitRate < r.interval.target / 2) ||
    (r.baseRate.count >= 2 && r.baseRate.right === 0);
  if (poor) return "poor";
  const good =
    r.baseRate.right === r.baseRate.count &&
    (r.binary.brier == null || r.binary.brier < 0.2) &&
    (hitRate == null || (hitRate >= r.interval.target - 15 && r.interval.veryWide < r.interval.count / 2));
  return good ? "good" : "ok";
}

/**
 * Coaching refs: `pattern` (the overall picture) and every base-rate item are always
 * required; so are ranges that missed and wrong answers given with 80%+ confidence.
 */
export function calibrationCoachingRefs(r: CalibrationResult): { required: string[]; allowed: string[] } {
  const needs = (o: CalibrationItemOutcome) =>
    o.kind === "baserate" ||
    (o.kind === "interval" && !o.correct) ||
    (o.kind === "binary" && !o.correct && (o.confidence ?? 0) >= 80);
  return {
    required: ["pattern", ...r.items.filter(needs).map((o) => `item_${o.id}`)],
    allowed: ["pattern", ...r.items.map((o) => `item_${o.id}`)],
  };
}

/** Below this many answered questions, the History summary stays hidden: too noisy. */
export const CALIBRATION_HISTORY_MIN = 30;

export interface CalibrationHistory {
  /** Answered questions of every kind. */
  answered: number;
  exercises: number;
  /** Two-answer questions, per confidence step. */
  buckets: { confidence: number; count: number; right: number }[];
  /** Ranges per target (80 and 90). */
  ranges: { target: number; count: number; hits: number }[];
  baseRate: { count: number; right: number };
}

/** "How sure vs how right" across finished Calibration exercises (PLAN-psychology.md P2). */
export function aggregateCalibration(results: CalibrationResult[]): CalibrationHistory {
  const buckets = new Map<number, { count: number; right: number }>();
  const ranges = new Map<number, { count: number; hits: number }>();
  let baseCount = 0;
  let baseRight = 0;
  let answered = 0;
  for (const r of results) {
    answered += r.items.filter((o) => o.answered).length;
    for (const bk of r.binary.buckets) {
      const prev = buckets.get(bk.confidence) ?? { count: 0, right: 0 };
      buckets.set(bk.confidence, { count: prev.count + bk.count, right: prev.right + bk.right });
    }
    if (r.interval.count > 0) {
      const prev = ranges.get(r.interval.target) ?? { count: 0, hits: 0 };
      ranges.set(r.interval.target, { count: prev.count + r.interval.count, hits: prev.hits + r.interval.hits });
    }
    baseCount += r.baseRate.count;
    baseRight += r.baseRate.right;
  }
  return {
    answered,
    exercises: results.length,
    buckets: [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([confidence, v]) => ({ confidence, ...v })),
    ranges: [...ranges.entries()].sort((a, b) => a[0] - b[0]).map(([target, v]) => ({ target, ...v })),
    baseRate: { count: baseCount, right: baseRight },
  };
}
