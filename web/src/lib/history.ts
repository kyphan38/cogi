// Pure helpers of the History page.

import {
  isAnalyticalExercise,
  isEvaluativeExercise,
  isSystemsExercise,
  type Exercise,
} from "@/lib/types/exercise";
import type { ClarityPerspectiveKind } from "@/lib/types/perspective";

export function perspectiveKindForExercise(
  ex: Exercise,
): ClarityPerspectiveKind | null {
  if (isAnalyticalExercise(ex)) return "analytical";
  if (isSystemsExercise(ex)) return "systems";
  if (isEvaluativeExercise(ex)) {
    return ex.variant === "matrix" ? "evaluative-matrix" : "evaluative-scoring";
  }
  return null;
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/** The day only, e.g. "8 Oct 2026". */
export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const HEATMAP_WEEKS = 14;

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

/** Local day key, e.g. "2026-11-25". */
export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA");
}

/** Finished exercises grouped by local day, newest first within a day. */
export function activityByDay(rows: Exercise[]): Map<string, Exercise[]> {
  const days = new Map<string, Exercise[]>();
  const done = rows
    .filter((ex) => ex.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  for (const ex of done) {
    const key = dayKey(ex.completedAt!);
    const list = days.get(key);
    if (list) list.push(ex);
    else days.set(key, [ex]);
  }
  return days;
}

/** Heatmap shade step for a day: 0 (none), 1, 2, or 3 (three or more). */
export function activityLevel(count: number): 0 | 1 | 2 | 3 {
  return count <= 0 ? 0 : count >= 3 ? 3 : (count as 1 | 2);
}

// Gray only (DESIGN.md), far enough apart to tell at a glance. Opacity on ink
// works in light and dark.
const ACTIVITY_SWATCH = ["bg-muted/50", "bg-foreground/30", "bg-foreground/60", "bg-foreground"] as const;

export function activitySwatchClass(level: 0 | 1 | 2 | 3): string {
  return ACTIVITY_SWATCH[level];
}
