/**
 * Forecast journal: a real event, a chance in percent and a due day. When the day
 * comes the user marks what happened, and the code scores it. No AI.
 */
export interface Forecast {
  id: string;
  /** A yes/no statement about the future, e.g. "The team ships v2 by 30 November". */
  question: string;
  /** The chance it happens, 1-99 percent. */
  probability: number;
  /** Local day "YYYY-MM-DD" when the answer is known. */
  dueDay: string;
  createdAt: string;
  outcome: "yes" | "no" | null;
  resolvedAt: string | null;
}

export const FORECAST_QUESTION_MAX = 200;

export type ForecastInput = { question: string; probability: number; dueDay: string };

/** Why the form cannot be saved, or null when it can. */
export function forecastInputError(input: ForecastInput, today: string): string | null {
  if (!input.question.trim()) return "Write what you expect to happen.";
  if (input.question.trim().length > FORECAST_QUESTION_MAX) return `Keep it under ${FORECAST_QUESTION_MAX} characters.`;
  if (!Number.isInteger(input.probability) || input.probability < 1 || input.probability > 99) return "Pick a chance from 1 to 99.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDay)) return "Pick the day you will know.";
  if (input.dueDay <= today) return "Pick a day after today.";
  return null;
}

/** Unresolved forecasts whose day has come, oldest first. */
export function dueForecasts(all: Forecast[], today: string): Forecast[] {
  return all.filter((f) => !f.outcome && f.dueDay <= today).sort((a, b) => a.dueDay.localeCompare(b.dueDay));
}

/** Unresolved forecasts still waiting, soonest first. */
export function openForecasts(all: Forecast[], today: string): Forecast[] {
  return all.filter((f) => !f.outcome && f.dueDay > today).sort((a, b) => a.dueDay.localeCompare(b.dueDay));
}

/** Resolved forecasts, newest answer first. */
export function resolvedForecasts(all: Forecast[]): Forecast[] {
  return all.filter((f) => f.outcome && f.resolvedAt).sort((a, b) => b.resolvedAt!.localeCompare(a.resolvedAt!));
}

/**
 * Brier score: the mean squared gap between the chance given and what happened.
 * 0 is perfect; 0.25 is what always saying 50% gets. Null with nothing resolved.
 */
export function brierScore(all: Forecast[]): number | null {
  const done = resolvedForecasts(all);
  if (done.length === 0) return null;
  const sum = done.reduce((s, f) => s + (f.probability / 100 - (f.outcome === "yes" ? 1 : 0)) ** 2, 0);
  return sum / done.length;
}

export interface ForecastBucket {
  /** Bucket range in percent, e.g. 60-80. */
  from: number;
  to: number;
  count: number;
  happened: number;
  /** Mean chance given in this bucket. */
  said: number;
}

const BUCKET_EDGES = [0, 20, 40, 60, 80, 100] as const;

/** "You said about X%, it happened Y% of the time", in five ranges. Empty ranges are left out. */
export function forecastBuckets(all: Forecast[]): ForecastBucket[] {
  const done = resolvedForecasts(all);
  const out: ForecastBucket[] = [];
  for (let i = 0; i < BUCKET_EDGES.length - 1; i++) {
    const from = BUCKET_EDGES[i]!;
    const to = BUCKET_EDGES[i + 1]!;
    const inside = done.filter((f) => f.probability >= from && (f.probability < to || (to === 100 && f.probability <= to)));
    if (inside.length === 0) continue;
    out.push({
      from,
      to,
      count: inside.length,
      happened: inside.filter((f) => f.outcome === "yes").length,
      said: Math.round(inside.reduce((s, f) => s + f.probability, 0) / inside.length),
    });
  }
  return out;
}

/** One word on the Brier score, so the number means something. */
export function brierWord(brier: number): string {
  if (brier <= 0.1) return "very good";
  if (brier <= 0.2) return "good";
  if (brier < 0.25) return "a little better than guessing 50%";
  return "no better than guessing 50%";
}
