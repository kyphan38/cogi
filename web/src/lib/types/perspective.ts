import type { PerspectiveKind } from "@/lib/types/disagreement";

/** Structured AI perspective - clarity v2 (self-anchored critiques). */
export interface HighlightCritique {
  id?: string;
  userTextSnippet: string;
  critique: string;
  remediationAlternative: string;
}

export interface NodeCritique {
  nodeId: string;
  nodeLabel: string;
  userImpact: "none" | "direct" | "indirect";
  userContextSnippet: string;
  critique: string;
  remediationAlternative: string;
}

export interface PlacementCritique {
  optionId: string;
  optionTitle: string;
  userQuadrant: string;
  userValueContext: string;
  aiEvaluationText: string;
}

export interface CriterionCritique {
  criterionId: string;
  criterionLabel: string;
  userAssignedWeight: number;
  userValueContext: string;
  aiEvaluationText: string;
}

export interface StepCritique {
  phaseId: string;
  promptQuestion: string;
  userResponseSnippet: string;
  critique: string;
  remediationAlternative: string;
}

export interface OutcomeCritique {
  optionId: string;
  optionTitle: string;
  userImpliedEv: number | null;
  aiEv: number | null;
  critique: string;
}

export interface ClarityPerspectiveBase {
  perspectiveFormat: "clarity_v2";
  title: string;
  suitableFor: string;
  openQuestions?: string[];
}

export interface AnalyticalPerspectiveStructured extends ClarityPerspectiveBase {
  highlightCritiques: HighlightCritique[];
}

export interface SystemsPerspectiveStructured extends ClarityPerspectiveBase {
  nodeCritiques: NodeCritique[];
}

export interface EvaluativeMatrixPerspectiveStructured extends ClarityPerspectiveBase {
  placementCritiques: PlacementCritique[];
}

export interface EvaluativeScoringPerspectiveStructured extends ClarityPerspectiveBase {
  critiqueMatrix: CriterionCritique[];
}

export interface GenerativePerspectiveStructured extends ClarityPerspectiveBase {
  stepCritiques: StepCritique[];
}

export interface EvaluativeUncertaintyPerspectiveStructured extends ClarityPerspectiveBase {
  outcomeCritiques: OutcomeCritique[];
}

export type ClarityPerspectiveStructured =
  | AnalyticalPerspectiveStructured
  | SystemsPerspectiveStructured
  | EvaluativeMatrixPerspectiveStructured
  | EvaluativeScoringPerspectiveStructured
  | EvaluativeUncertaintyPerspectiveStructured
  | GenerativePerspectiveStructured;

/** @deprecated Legacy four-section shape; read-only fallback for saved exercises. */
export interface PerspectivePoint {
  id: string;
  title?: string;
  body: string;
}

export interface LegacyPerspectiveStructured {
  perspectiveFormat?: "legacy";
  embedded: PerspectivePoint[];
  userFound: PerspectivePoint[];
  additional: PerspectivePoint[];
  openQuestions: PerspectivePoint[];
}

export type AIPerspectiveStructured = ClarityPerspectiveStructured | LegacyPerspectiveStructured;

export function isLegacyPerspectiveStructured(
  s: AIPerspectiveStructured,
): s is LegacyPerspectiveStructured {
  if (isClarityPerspectiveStructured(s)) return false;
  return "embedded" in s && Array.isArray(s.embedded);
}

export function isClarityPerspectiveStructured(
  s: AIPerspectiveStructured,
): s is ClarityPerspectiveStructured {
  return "perspectiveFormat" in s && s.perspectiveFormat === "clarity_v2";
}

export type ClarityPerspectiveKind = Extract<
  PerspectiveKind,
  | "analytical"
  | "systems"
  | "evaluative-matrix"
  | "evaluative-scoring"
  | "evaluative-uncertainty"
  | "generative"
>;

/** Client-computed weight/score breakdown for one evaluative-scoring criterion (replaces the AI's run-on summary sentence). */
export interface EvaluativeScoringCriterionBreakdown {
  criterionId: string;
  criterionLabel: string;
  userWeight: number;
  aiSuggestedWeight?: number;
  optionScores: {
    optionId: string;
    optionTitle: string;
    userScore: number;
    aiSuggestedScore?: number;
  }[];
}
