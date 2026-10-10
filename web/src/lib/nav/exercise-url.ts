import type { Exercise } from "@/lib/types/exercise";

/**
 * Put a new exercise's id in the URL (`?resumeId=`), so Back, Forward and reload open
 * it again at its saved step instead of an empty setup. Replaces the entry, so Back
 * still goes to the page before the exercise.
 */
export function rememberExerciseInUrl(row: Pick<Exercise, "id" | "type">): void {
  try {
    const target = `/exercise/${row.type}?resumeId=${encodeURIComponent(row.id)}`;
    if (window.location.pathname + window.location.search === target) return;
    window.history.replaceState(null, "", target);
  } catch {
    // Only a convenience.
  }
}
