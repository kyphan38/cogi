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

// Four gray steps far enough apart to tell at a glance (DESIGN.md: gray only,
// the name always next to it). Opacity on ink works in light and dark.
export function typeSwatchClass(t: Exercise["type"]): string {
  switch (t) {
    case "evaluative":
      return "bg-foreground";
    case "systems":
      return "bg-foreground/55";
    case "analytical":
      return "bg-foreground/30";
    default:
      return "bg-foreground/15";
  }
}
