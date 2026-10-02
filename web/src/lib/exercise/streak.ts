import type { Exercise } from "@/lib/types/exercise";

/**
 * Days in a row (local time) with at least one completed exercise. A streak that
 * ended yesterday still counts, so it does not drop to 0 before today's practice.
 */
export function computeStreak(done: Pick<Exercise, "completedAt">[], now: Date = new Date()): number {
  const daySet = new Set<string>();
  for (const ex of done) {
    if (!ex.completedAt) continue;
    daySet.add(new Date(ex.completedAt).toLocaleDateString("en-CA"));
  }
  if (daySet.size === 0) return 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  if (!daySet.has(cursor.toLocaleDateString("en-CA"))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let s = 0;
  for (;;) {
    const k = cursor.toLocaleDateString("en-CA");
    if (!daySet.has(k)) break;
    s += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return s;
}
