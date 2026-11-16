"use client";

import type {
  EvaluativeExerciseRow,
  EvaluativeMatrixRow,
  EvaluativeScoringRow,
  EvaluativeUncertaintyRow,
} from "@/lib/types/exercise";
import {
  isGeopoliticsEvaluativePayload,
  type EvaluativeExercisePayload,
} from "@/lib/ai/validators/evaluative";

export const SOURCE_OPTIONS = [
  { value: "generated", label: "AI-generated from domain" },
  { value: "custom_scenario", label: "My scenario" },
] as const;

export type FlowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Internal step that shows AI feedback (the 3rd practice phase). */
export const FEEDBACK_STEP = 4;

/**
 * Where an unfinished exercise reopens. Saved before the 3-step loop, it may sit on
 * steps that no longer exist: confidence (3) is now part of the work step (2), and
 * journal / action (5, 6) fold into feedback (4).
 */
export function resumeStep(saved: number | undefined): FlowStep {
  const s = saved ?? 1;
  if (s === 3) return 2;
  if (s >= 5) return 4;
  return s as FlowStep;
}

export function isGeopoliticsEvaluativeExercise(
  ex: EvaluativeExerciseRow,
): boolean {
  return (
    ex.variant === "scoring" &&
    (ex.isGeopolitics ?? Boolean(ex.stakeholderNote?.trim()))
  );
}

export function payloadToRow(
  id: string,
  domain: string,
  data: EvaluativeExercisePayload,
  customScenario?: string,
): EvaluativeExerciseRow {
  if (data.variant === "matrix") {
    const row: EvaluativeMatrixRow = {
      id,
      type: "evaluative",
      variant: "matrix",
      domain,
      customScenario,
      title: data.title,
      scenario: data.scenario,
      userProposedCriteria: null,
      axisX: data.axisX,
      axisY: data.axisY,
      options: data.options,
      placements: {},
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    return row;
  }
  if (data.variant === "uncertainty") {
    const row: EvaluativeUncertaintyRow = {
      id,
      type: "evaluative",
      variant: "uncertainty",
      domain,
      customScenario,
      title: data.title,
      scenario: data.scenario,
      options: data.options,
      userProbabilities: {},
      userPayoffs: {},
      outcomeIntuitionText: "",
      confidenceBefore: null,
      aiPerspective: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    return row;
  }
  const geo = isGeopoliticsEvaluativePayload(data);
  const weights: Record<string, number> = {};
  const scores: Record<string, Record<string, number>> = {};
  for (const c of data.criteria) {
    weights[c.id] = geo ? 3 : c.suggestedWeight;
  }
  for (const o of data.options) {
    if (geo) {
      scores[o.id] = Object.fromEntries(data.criteria.map((c) => [c.id, 3]));
    } else {
      scores[o.id] = { ...o.suggestedScores };
    }
  }
  const row: EvaluativeScoringRow = {
    id,
    type: "evaluative",
    variant: "scoring",
    domain,
    customScenario,
    title: data.title,
    scenario: data.scenario,
    isGeopolitics: geo,
    stakeholderNote: geo ? data.stakeholderNote : undefined,
    userStakeholderMapping: geo ? null : undefined,
    stakeholderMappingRevealed: false,
    userProposedCriteria: null,
    criteria: data.criteria,
    options: data.options,
    hiddenCriteria: data.hiddenCriteria,
    criterionWeights: weights,
    scores,
    confidenceBefore: null,
    aiPerspective: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  return row;
}
