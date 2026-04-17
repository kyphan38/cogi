import type { SequentialStepSpec } from "@/lib/types/exercise";

/**
 * Phase 1.3b sequential row: % of dependency constraints satisfied in the user's order.
 * Edges where both endpoints have `isFlexible: true` are excluded (order swaps within
 * the flexible group do not affect the score).
 */
export function computeSequentialAccuracy(
  steps: SequentialStepSpec[],
  userOrderedStepIds: string[],
): number {
  const byId = new Map(steps.map((s) => [s.id, s] as const));
  const index = new Map<string, number>();
  userOrderedStepIds.forEach((id, i) => {
    if (byId.has(id)) index.set(id, i);
  });

  let counted = 0;
  let satisfied = 0;

  for (const step of steps) {
    const iStep = index.get(step.id);
    if (iStep === undefined) continue;

    for (const depId of step.dependencies) {
      const depStep = byId.get(depId);
      if (!depStep) continue;

      if (step.isFlexible && depStep.isFlexible) {
        continue;
      }

      counted += 1;
      const iDep = index.get(depId);
      if (iDep === undefined) {
        continue;
      }
      if (iDep < iStep) {
        satisfied += 1;
      }
    }
  }

  if (counted === 0) return 100;
  return Math.round((satisfied / counted) * 100);
}
