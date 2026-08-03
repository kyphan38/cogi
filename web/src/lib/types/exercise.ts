import type { AnalyticalExercise } from "@/lib/ai/validators/common";
import type { EvaluativeQuadrant } from "@/lib/ai/validators/evaluative";
import type { GenerativeStage } from "@/lib/ai/validators/generative";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import type { SystemsExercisePayload } from "@/lib/ai/validators/systems";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";
import type { JournalPromptItem } from "@/lib/ai/prompts/journal-pool";

export type EmotionLabel =
  | "anxious"
  | "excited"
  | "frustrated"
  | "confident"
  | "uncertain"
  | "defensive"
  | "neutral";

/** In-progress journal step state, autosaved so it survives an abandoned session. */
export interface JournalDraft {
  prompts: JournalPromptItem[];
  responses: Record<string, string>;
  aiReferenceLine: string | null;
  emotionLabel?: EmotionLabel;
}

export type ThinkingType =
  | "analytical"
  | "sequential"
  | "systems"
  | "evaluative"
  | "generative"
  | "combo";

/** Pre-defined combo chains (Phase 6.5). */
export type ComboPresetId = "full_analysis" | "decision_sprint" | "root_cause";

export type { EvaluativeQuadrant, GenerativeStage };

export type { SystemsConnectionType };

export type SystemsNodeSpec = SystemsExercisePayload["nodes"][number];
export type SystemsIntendedConnection = SystemsExercisePayload["intendedConnections"][number];
export type SystemsShockEvent = SystemsExercisePayload["shockEvent"];

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
  /** Task type: highlight & tag embedded issues (default/legacy), or steelman a position. Absent = "highlight_tag". */
  analyticalVariant?: "highlight_tag" | "steelman";
  /** User's free-text steelman of `passage` (steelman variant only). */
  steelmanText?: string | null;
  /** AI-rubric score for the steelman variant (no span-based ground truth to score against). */
  rubricScore?: number | null;
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  userHighlights: UserHighlight[];
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  journalDraft?: JournalDraft;
  actionDraftText?: string;
}

export type CriticalErrorSeverity = "catastrophic" | "problematic" | "suboptimal";

export interface SequentialCriticalError {
  description: string;
  severity: CriticalErrorSeverity;
}

export interface SequentialStepSpec {
  id: string;
  text: string;
  correctPosition: number;
  dependencies: string[];
  isFlexible: boolean;
  explanation: string;
}

/** Persisted sequential exercise (ordering mechanic + user state). */
export interface SequentialExerciseRow {
  id: string;
  type: "sequential";
  domain: string;
  customScenario?: string;
  title: string;
  scenario: string;
  steps: SequentialStepSpec[];
  criticalErrors: SequentialCriticalError[];
  /** Left-to-right process order (user answer). */
  userOrderedStepIds: string[];
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  journalDraft?: JournalDraft;
  actionDraftText?: string;
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
  journalDraft?: JournalDraft;
  actionDraftText?: string;
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
  journalDraft?: JournalDraft;
  actionDraftText?: string;
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
  /** User's proposed criteria before seeing AI framework. */
  userProposedCriteria?: { name: string; rationale: string }[] | null;
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
  journalDraft?: JournalDraft;
  actionDraftText?: string;
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
  journalDraft?: JournalDraft;
  actionDraftText?: string;
}

export type EvaluativeExerciseRow = EvaluativeMatrixRow | EvaluativeScoringRow | EvaluativeUncertaintyRow;

export interface GenerativePromptPersisted {
  id: string;
  question: string;
  draftText?: string;
  hints?: string[];
  spareHint?: string;
}

/** Structured write + debate (Phase 4.2). */
export interface GenerativeExerciseRow {
  id: string;
  type: "generative";
  domain: string;
  customScenario?: string;
  /** True when exercise used geopolitics scenario-planning generation. */
  isGeopolitics?: boolean;
  /** Task type: argue & defend (default/legacy), reframing, or inversion/pre-mortem. Absent = "argue_debate". */
  generativeVariant?: "argue_debate" | "reframing" | "inversion";
  title: string;
  scenario: string;
  /** Scaffold stage locked when exercise was generated. */
  stageAtStart: GenerativeStage;
  prompts: GenerativePromptPersisted[];
  answers: Record<string, string>;
  steelmanText?: string | null;
  /** Initial drafts for edit-stage edit detection (empty if not edit). */
  draftBaseline: Record<string, string>;
  debateOpening: string | null;
  debateTurns: { userText: string; assistantText: string }[];
  rubricScore: number | null;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  journalDraft?: JournalDraft;
  actionDraftText?: string;
}

export type ComboSubExercise =
  | AnalyticalExerciseRow
  | SequentialExerciseRow
  | SystemsExerciseRow
  | EvaluativeExerciseRow
  | GenerativeExerciseRow;

/** One history row with multiple completed mechanics on the same scenario. */
export interface ComboExerciseRow {
  id: string;
  type: "combo";
  preset: ComboPresetId;
  domain: string;
  customScenario?: string;
  title: string;
  scenario: string;
  subExercises: ComboSubExercise[];
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  journalDraft?: JournalDraft;
  actionDraftText?: string;
}

export type Exercise =
  | AnalyticalExerciseRow
  | SequentialExerciseRow
  | SystemsExerciseRow
  | EvaluativeExerciseRow
  | GenerativeExerciseRow
  | ComboExerciseRow;

export function isAnalyticalExercise(ex: Exercise): ex is AnalyticalExerciseRow {
  return ex.type === "analytical";
}

export function isSequentialExercise(ex: Exercise): ex is SequentialExerciseRow {
  return ex.type === "sequential";
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

export function isGenerativeExercise(ex: Exercise): ex is GenerativeExerciseRow {
  return ex.type === "generative";
}

export function isComboExercise(ex: Exercise): ex is ComboExerciseRow {
  return ex.type === "combo";
}

export interface ConfidenceRecord {
  id: string;
  exerciseId: string;
  confidenceBefore: number;
  actualAccuracy: number;
  gap: number;
  createdAt: string;
}
