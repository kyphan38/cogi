import type { Scenario } from "@/lib/types/math-scenario";
import { scenarioObjectSchema } from "@/lib/scenarios/scenario-schema";

/**
 * AI-drafted, unverified Math scenarios are never in the static allScenarios array (they're
 * generated on the fly per-request), so /math/[id]/page.tsx can't resolve them via
 * getScenarioById. This tab-scoped sessionStorage cache is a fast-path hand-off: the topic
 * picker saves a generated scenario here right before navigating to /math/{id}, and the runner
 * reads it back synchronously to avoid a render flash. It is NOT the source of truth for
 * progress - the runner also persists the scenario snapshot + loop state to the
 * `activeMathSessions` Firestore collection (see lib/db/math-sessions.ts), so a closed tab or a
 * different device can still resume. A copied link opened in a fresh tab falls back to that
 * Firestore doc rather than 404ing.
 */
function storageKey(id: string): string {
  return `cogi:math-draft:${id}`;
}

export function saveDraftScenario(scenario: Scenario): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(scenario.id), JSON.stringify(scenario));
  } catch {
    // sessionStorage unavailable (private mode, quota) - the runner will just show "not found".
  }
}

export function loadDraftScenario(id: string): Scenario | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = scenarioObjectSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as Scenario) : null;
  } catch {
    return null;
  }
}
