"use client";

import type {
  SystemsExerciseRow,
  SystemsLookAhead,
  SystemsNodeImpact,
} from "@/lib/types/exercise";

export const EMPTY_LOOK_AHEAD: SystemsLookAhead = {
  loop: null,
  forecast: "",
  fix: "",
};

export const SOURCE_OPTIONS = [
  { value: "generated", label: "AI-generated from domain" },
  { value: "custom_scenario", label: "My scenario" },
] as const;

export type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function isGeopoliticsSystemsExercise(ex: SystemsExerciseRow): boolean {
  return (
    ex.isGeopolitics ??
    Boolean(
      ex.perspectiveBName?.trim() &&
      ex.intendedConnectionsB?.length &&
      ex.shockEventB,
    )
  );
}

export function isResilienceSystemsExercise(ex: SystemsExerciseRow): boolean {
  return ex.variantKind === "resilience";
}

/** Resilience inserts a "Criticality" step after Connect and a "Cascade" step after the first
 * shock; geopolitics inserts a "Perspective swap" step after the first shock. The two variants
 * are mutually exclusive, so each row is at most one of isGeo/isResilience. */
export function systemsVariantSteps(ex: SystemsExerciseRow | null): {
  isGeo: boolean;
  isResilience: boolean;
  criticalityStep: FlowStep;
  confidenceStep: FlowStep;
  shockStep: FlowStep;
  cascadeStep: FlowStep;
  perspectiveStep: FlowStep;
  journalStep: FlowStep;
  actionStep: FlowStep;
  doneStep: FlowStep;
} {
  const isGeo = ex ? isGeopoliticsSystemsExercise(ex) : false;
  const isResilience = ex ? isResilienceSystemsExercise(ex) : false;
  return {
    isGeo,
    isResilience,
    criticalityStep: 3,
    confidenceStep: isResilience ? 4 : 3,
    shockStep: isResilience ? 5 : 4,
    cascadeStep: 6,
    perspectiveStep: isResilience ? 7 : isGeo ? 6 : 5,
    journalStep: isResilience ? 8 : isGeo ? 7 : 6,
    actionStep: isResilience ? 9 : isGeo ? 8 : 7,
    doneStep: isResilience ? 10 : isGeo ? 9 : 8,
  };
}

/**
 * Where an unfinished exercise reopens. Saved before the 3-step loop it may sit on a
 * step that no longer exists: confidence now lives in the shock step, and journal /
 * action fold into AI feedback.
 */
export function systemsResumeStep(row: SystemsExerciseRow): FlowStep {
  const {
    confidenceStep,
    shockStep,
    perspectiveStep,
    journalStep,
    actionStep,
  } = systemsVariantSteps(row);
  const saved = (row.currentStep ?? 1) as FlowStep;
  if (saved === confidenceStep) return shockStep;
  if (saved === journalStep || saved === actionStep) return perspectiveStep;
  return saved;
}

export function emptyImpact(
  nodeIds: string[],
): Record<string, SystemsNodeImpact> {
  const o: Record<string, SystemsNodeImpact> = {};
  for (const id of nodeIds) o[id] = "none";
  return o;
}

export function cycleImpact(v: SystemsNodeImpact): SystemsNodeImpact {
  if (v === "none") return "direct";
  if (v === "direct") return "indirect";
  return "none";
}
