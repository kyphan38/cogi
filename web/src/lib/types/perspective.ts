export type PerspectiveKind =
  | "analytical"
  | "systems"
  | "evaluative-matrix"
  | "evaluative-scoring"
  | "evaluative-uncertainty";


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

export interface EvaluativeUncertaintyPerspectiveStructured extends ClarityPerspectiveBase {
  outcomeCritiques: OutcomeCritique[];
}

export type ClarityPerspectiveStructured =
  | AnalyticalPerspectiveStructured
  | SystemsPerspectiveStructured
  | EvaluativeMatrixPerspectiveStructured
  | EvaluativeScoringPerspectiveStructured
  | EvaluativeUncertaintyPerspectiveStructured;

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

/**
 * Analytical feedback v3: code decides right and wrong (`AnalyticalResult`); the AI
 * only explains each case. `ref` points at what it explains: `issue_<n>` and
 * `decoy_<n>` (1-based, in answer-key order) or `extra_<n>` (the n-th highlight that
 * matched neither).
 */
export interface AnalyticalCoachingItem {
  ref: string;
  why: string;
  clue: string;
  nextTimeAsk: string;
  /** A more specific common name (e.g. "False dilemma"), shown as a type of the tag. */
  subtypeName?: string;
}

export interface AnalyticalCoachingStructured {
  perspectiveFormat: "analytical_v3";
  title: string;
  items: AnalyticalCoachingItem[];
  /** 1-2 lessons to carry to the next exercise. */
  takeaways: string[];
  /** Geopolitics only: a short note on the user's perspective and missing-actor guesses. */
  metaNote?: string;
}

/**
 * The same coaching shape for Systems and Evaluative (plan phase 6a). Refs depend on
 * the exercise type, e.g. `node_<id>`, `conn_<n>`, `option_<id>`, `criterion_<id>`.
 */
export interface CoachingStructured extends Omit<AnalyticalCoachingStructured, "perspectiveFormat"> {
  perspectiveFormat: "coaching_v3";
}

export type AIPerspectiveStructured =
  | ClarityPerspectiveStructured
  | LegacyPerspectiveStructured
  | AnalyticalCoachingStructured
  | CoachingStructured;

export function isCoachingStructured(
  s: AIPerspectiveStructured | null | undefined,
): s is CoachingStructured {
  return s != null && "perspectiveFormat" in s && s.perspectiveFormat === "coaching_v3";
}

export function isAnalyticalCoachingStructured(
  s: AIPerspectiveStructured | null | undefined,
): s is AnalyticalCoachingStructured {
  return s != null && "perspectiveFormat" in s && s.perspectiveFormat === "analytical_v3";
}

export function isLegacyPerspectiveStructured(
  s: AIPerspectiveStructured,
): s is LegacyPerspectiveStructured {
  if (isClarityPerspectiveStructured(s) || isAnalyticalCoachingStructured(s) || isCoachingStructured(s)) {
    return false;
  }
  return "embedded" in s && Array.isArray(s.embedded);
}

export function isClarityPerspectiveStructured(
  s: AIPerspectiveStructured,
): s is ClarityPerspectiveStructured {
  return "perspectiveFormat" in s && s.perspectiveFormat === "clarity_v2";
}

/** Every perspective kind now uses the clarity v2 shape. */
export type ClarityPerspectiveKind = PerspectiveKind;

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
