import type { AnalyticalExercise } from "@/lib/ai/validators/common";
import type { EvaluativeQuadrant } from "@/lib/ai/validators/evaluative";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import type { SystemsExercisePayload } from "@/lib/ai/validators/systems";
import type { SystemsResilienceExercisePayload } from "@/lib/ai/validators/systems";
import type { SystemsTaskType } from "@/lib/ai/validators/systems";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

/** The exercise types the app offers. Old rows of removed types may still exist in Firestore. */
export type ThinkingType = "analytical" | "systems" | "evaluative";

/** Pre-defined combo chains (Phase 6.5). */
export type { EvaluativeQuadrant };

export type { SystemsConnectionType };

export type { SystemsTaskType };

export type SystemsNodeSpec = SystemsExercisePayload["nodes"][number];
export type SystemsIntendedConnection = SystemsExercisePayload["intendedConnections"][number];
export type SystemsShockEvent = SystemsExercisePayload["shockEvent"];
export type SystemsNodeCriticalityHint =
  SystemsResilienceExercisePayload["criticalityGroundTruth"][number];

export type ValidPoint = AnalyticalExercise["validPoints"][number];

/** User-facing tags (includes UI-only tags not returned as embedded issue types). */
export type TagType =
  | "logical_fallacy"
  | "hidden_assumption"
  | "weak_evidence"
  | "bias"
  | "framing_bias"
  | "missing_actor"
  | "assumed_causation"
  | "analogy_misuse"
  | "valid_point"
  | "unclear";

export type IssueSeverity = "obvious" | "moderate" | "subtle";

export interface EmbeddedIssue {
  description: string;
  type: Exclude<TagType, "valid_point" | "unclear">;
  severity: IssueSeverity;
  textSegment: string;
  explanation: string;
}

export interface UserHighlight {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  tag: TagType;
}

/** How one embedded issue was handled, scored in code (`lib/exercise/analytical-score.ts`). */
export interface AnalyticalIssueOutcome {
  /** Index into `embeddedIssues`. */
  index: number;
  type: EmbeddedIssue["type"];
  severity: IssueSeverity;
  /** The highlight that covers this issue, if any (it may carry a non-issue tag). */
  highlightId: string | null;
  userTag: TagType | null;
  /** Covered by a highlight whose tag says "problem". */
  found: boolean;
  /** Found, and tagged with the issue's own type. */
  tagCorrect: boolean;
}

/** How one decoy (valid point) was handled. */
export interface AnalyticalDecoyOutcome {
  /** Index into `validPoints`. */
  index: number;
  highlightId: string | null;
  userTag: TagType | null;
  /** The user tagged this sound statement as a problem. */
  trapped: boolean;
}

export interface AnalyticalResult {
  issues: AnalyticalIssueOutcome[];
  decoys: AnalyticalDecoyOutcome[];
  /** Highlights that match neither an issue nor a decoy. */
  extraHighlightIds: string[];
  found: number;
  total: number;
  tagsCorrect: number;
  trapsHit: number;
  decoyTotal: number;
}

/** Persisted analytical exercise (extends generated payload + user state). */
export interface AnalyticalExerciseRow {
  id: string;
  type: "analytical";
  domain: string;
  /** User-provided situation for custom-scenario generation (optional). */
  customScenario?: string;
  title: string;
  /** Source of passage text (AI-generated vs user-provided real data). */
  source?: "ai" | "real_data";
  /** If source === "real_data", snapshot of the user's sanitized text. */
  originalUserText?: string | null;
  passage: string;
  /** True when the passage has no embedded issues (sound reasoning exercise). */
  isSoundReasoning?: boolean;
  /** Geopolitics analytical generation (framing bias, missing actors, etc.). */
  isGeopolitics?: boolean;
  hiddenPerspective?: string;
  missingActors?: string[];
  userPerspectiveGuess?: string;
  userMissingActorsGuess?: string[];
  metaGuessScore?: number;
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  userHighlights: UserHighlight[];
  /** Highlights scored against the answer key when submitted. Older rows lack it. */
  result?: AnalyticalResult | null;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

export interface SystemsUserEdge {
  id: string;
  source: string;
  target: string;
  type: SystemsConnectionType;
}

export type SystemsNodeImpact = "none" | "direct" | "indirect";

/** Persisted systems-thinking exercise (React Flow graph + shock). */
export interface SystemsExerciseRow {
  id: string;
  type: "systems";
  domain: string;
  customScenario?: string;
  title: string;
  scenario: string;
  nodes: SystemsNodeSpec[];
  intendedConnections: SystemsIntendedConnection[];
  shockEvent: SystemsShockEvent;
  /** AI-generated pool (real node labels + distractors) the user picks their "before I see the AI's answer" guesses from. */
  componentCandidates?: string[];
  /** Geopolitics: dual-perspective systems generation. */
  isGeopolitics?: boolean;
  perspectiveAName?: string;
  perspectiveBName?: string;
  intendedConnectionsB?: SystemsIntendedConnection[];
  shockEventB?: {
    directlyAffected: string[];
    indirectlyAffected: string[];
    explanation: string;
  };
  userPerspectiveBNotes?: string;
  /** Resilience audit: two-hop cascade variant. */
  variantKind?: "resilience";
  criticalityGroundTruth?: SystemsNodeCriticalityHint[];
  /** User's own criticality ranking guess (node id -> rank, 1 = most critical), set before the shock is revealed. */
  userCriticalityRanking?: Record<string, number>;
  secondShockEvent?: SystemsShockEvent;
  /** Per node_id impact assessment after the second (cascade) shock. */
  secondNodeImpact?: Record<string, SystemsNodeImpact>;
  /** User's proposed components before seeing AI nodes (diagnostic, not scored). */
  userProposedComponents?: string[] | null;
  userEdges: SystemsUserEdge[];
  /** Per node_id impact assessment after shock. */
  nodeImpact: Record<string, SystemsNodeImpact>;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

export interface EvaluativeAxisSpec {
  label: string;
  lowLabel: string;
  highLabel: string;
}

/** AI critique of the user's self-proposed criteria (Propose criteria step). */
export interface EvaluativeCriteriaFeedback {
  text: string;
  generatedAt: string;
}

export interface EvaluativeMatrixOption {
  id: string;
  title: string;
  description: string;
  intendedQuadrant: EvaluativeQuadrant;
  explanation: string;
}

/** Matrix variant (2 criteria as axes). */
export interface EvaluativeMatrixRow {
  id: string;
  type: "evaluative";
  variant: "matrix";
  domain: string;
  customScenario?: string;
  title: string;
  scenario: string;
  /** User's proposed criteria before seeing AI framework. */
  userProposedCriteria?: { name: string; rationale: string }[] | null;
  /** AI-suggested criterion name candidates to ease blank-page entry (optional pick list, not graded). */
  criteriaCandidates?: string[];
  /** AI feedback on the user's proposed criteria. */
  criteriaFeedback?: EvaluativeCriteriaFeedback | null;
  axisX: EvaluativeAxisSpec;
  axisY: EvaluativeAxisSpec;
  options: EvaluativeMatrixOption[];
  /** User placement per option id; may omit until placed. */
  placements: Partial<Record<string, EvaluativeQuadrant>>;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

export interface EvaluativeCriterion {
  id: string;
  label: string;
  description: string;
  /** True for a non-compensatory "hard constraint" criterion (dealbreaker variant). */
  isDealbreaker?: boolean;
  suggestedWeight: number;
}

export interface EvaluativeScoringOption {
  id: string;
  title: string;
  description: string;
  suggestedScores: Record<string, number>;
  explanation: string;
}

export interface EvaluativeHiddenCriterion {
  label: string;
  description: string;
}

export interface EvaluativeStakeholderMappingEntry {
  name: string;
  wants: string;
}

/** Weighted scoring table (3+ criteria). */
export interface EvaluativeScoringRow {
  id: string;
  type: "evaluative";
  variant: "scoring";
  domain: string;
  customScenario?: string;
  title: string;
  scenario: string;
  /** True when exercise used geopolitics evaluative generation. */
  isGeopolitics?: boolean;
  /** AI ground truth for stakeholder compare step. */
  stakeholderNote?: string;
  /** User stakeholder mapping before scoring (geo only). */
  userStakeholderMapping?: EvaluativeStakeholderMappingEntry[] | null;
  stakeholderMappingRevealed?: boolean;
  /** AI-suggested stakeholder/actor name candidates to ease blank-page entry (geo only; optional pick list, not graded). */
  stakeholderCandidates?: string[];
  /** User's proposed criteria before seeing AI framework. */
  userProposedCriteria?: { name: string; rationale: string }[] | null;
  /** AI-suggested criterion name candidates to ease blank-page entry (optional pick list, not graded). */
  criteriaCandidates?: string[];
  /** AI feedback on the user's proposed criteria. */
  criteriaFeedback?: EvaluativeCriteriaFeedback | null;
  criteria: EvaluativeCriterion[];
  options: EvaluativeScoringOption[];
  hiddenCriteria: EvaluativeHiddenCriterion[];
  criterionWeights: Record<string, number>;
  scores: Record<string, Record<string, number>>;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

export interface EvaluativeUncertaintyOutcome {
  id: string;
  label: string;
  probability: number; // AI ground truth, 0..1; outcomes within one option sum to 1
  payoff: number; // AI ground truth, signed (e.g. dollars)
  explanation: string;
}

export interface EvaluativeUncertaintyOption {
  id: string;
  title: string;
  description: string;
  outcomes: EvaluativeUncertaintyOutcome[];
}

/** Decision under uncertainty: options with probability/payoff-weighted outcomes. */
export interface EvaluativeUncertaintyRow {
  id: string;
  type: "evaluative";
  variant: "uncertainty";
  domain: string;
  customScenario?: string;
  title: string;
  scenario: string;
  options: EvaluativeUncertaintyOption[];
  /** [optionId][outcomeId] -> 0..1 */
  userProbabilities: Record<string, Record<string, number>>;
  userPayoffs: Record<string, Record<string, number>>;
  /** Step-1 free text ("Outcome intuition"); no AI call for this step. */
  outcomeIntuitionText?: string;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

export type EvaluativeExerciseRow = EvaluativeMatrixRow | EvaluativeScoringRow | EvaluativeUncertaintyRow;

export type Exercise = AnalyticalExerciseRow | SystemsExerciseRow | EvaluativeExerciseRow;

export function isAnalyticalExercise(ex: Exercise): ex is AnalyticalExerciseRow {
  return ex.type === "analytical";
}

export function isSystemsExercise(ex: Exercise): ex is SystemsExerciseRow {
  return ex.type === "systems";
}

export function isEvaluativeExercise(ex: Exercise): ex is EvaluativeExerciseRow {
  return ex.type === "evaluative";
}

export function isEvaluativeMatrix(ex: Exercise): ex is EvaluativeMatrixRow {
  return ex.type === "evaluative" && ex.variant === "matrix";
}

export function isEvaluativeScoring(ex: Exercise): ex is EvaluativeScoringRow {
  return ex.type === "evaluative" && ex.variant === "scoring";
}

export function isEvaluativeUncertainty(ex: Exercise): ex is EvaluativeUncertaintyRow {
  return ex.type === "evaluative" && ex.variant === "uncertainty";
}

/** Scoring exercise using the non-compensatory dealbreaker prompt (>=1 isDealbreaker criterion). */
export function isDealbreakerEvaluativeExercise(ex: EvaluativeExerciseRow): boolean {
  return ex.variant === "scoring" && ex.criteria.some((c) => c.isDealbreaker === true);
}

export interface ConfidenceRecord {
  id: string;
  exerciseId: string;
  confidenceBefore: number;
  actualAccuracy: number;
  gap: number;
  createdAt: string;
}
