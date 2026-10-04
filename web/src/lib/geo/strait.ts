import type { Chokepoint, RouteId } from "@/lib/geo/chokepoints";
import { countryName } from "@/lib/geo/countries";

/** "Close the strait", scored in code (PLAN-geopolitics.md G2). */
export interface StraitResult {
  /** Countries the user picked that depend most on the strait. */
  found: string[];
  /** Countries that depend most on it but were not picked. */
  missed: string[];
  /** Picked countries that are not among the top users. */
  extra: string[];
  routeCorrect: boolean;
}

export function scoreStrait(cp: Chokepoint, picked: string[], route: RouteId | null): StraitResult {
  const answer = new Set<string>(cp.game?.dependents ?? []);
  const chosen = [...new Set(picked)];
  return {
    found: chosen.filter((c) => answer.has(c)),
    missed: [...answer].filter((c) => !chosen.includes(c)),
    extra: chosen.filter((c) => !answer.has(c)),
    routeCorrect: route != null && route === cp.game?.route,
  };
}

/** The countries offered as choices, A to Z, so the order does not give the answer away. */
export function straitChoices(cp: Chokepoint): string[] {
  if (!cp.game) return [];
  const name = (id: string) => countryName(id) ?? id;
  return [...cp.game.dependents, ...cp.game.decoys].sort((a, b) => name(a).localeCompare(name(b)));
}
