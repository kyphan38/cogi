// Motion helpers with no React, so vitest can cover them.

/** Users who ask for less motion, and Node (tests, server render), skip motion. */
export function reducedMotion(): boolean {
  return (
    typeof matchMedia === "undefined" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Items that were in `prev` but are gone from `next`, so they can animate out. */
export function leavingItems<T extends { id: string | number }>(
  prev: T[],
  next: T[],
): T[] {
  const kept = new Set(next.map((x) => x.id));
  return prev.filter((x) => !kept.has(x.id));
}

/**
 * Which rows a live update added or removed. More than `maxDelta` changes
 * means the list was swapped (another filter, a big import), not edited, so it
 * returns null and nothing should animate.
 */
export function rowChanges(
  prevIds: string[],
  nextIds: string[],
  maxDelta = 3,
): { added: string[]; removed: string[] } | null {
  const before = new Set(prevIds);
  const after = new Set(nextIds);
  const added = nextIds.filter((id) => !before.has(id));
  const removed = prevIds.filter((id) => !after.has(id));
  return added.length + removed.length > maxDelta ? null : { added, removed };
}
