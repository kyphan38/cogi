import type { AnalyticalExercise } from "@/lib/ai/validators/common";
import type { EvaluativeQuadrant } from "@/lib/ai/validators/evaluative";
import type { GenerativeStage } from "@/lib/ai/validators/generative";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import type { SystemsExercisePayload } from "@/lib/ai/validators/systems";
import type { AIPerspectiveStructured } from "@/lib/types/perspective";

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
  title: string;
  /** Source of passage text (AI-generated vs user-provided real data). */
  source?: "ai" | "real_data";
  /** If source === "real_data", snapshot of the user's sanitized text. */
  originalUserText?: string | null;
  passage: string;
  /** True when the passage has no embedded issues (sound reasoning exercise). */
  isSoundReasoning?: boolean;
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  userHighlights: UserHighlight[];
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
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
  title: string;
  scenario: string;
  nodes: SystemsNodeSpec[];
  intendedConnections: SystemsIntendedConnection[];
  shockEvent: SystemsShockEvent;
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
}

export interface EvaluativeAxisSpec {
  label: string;
  lowLabel: string;
  highLabel: string;
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
  title: string;
  scenario: string;
  /** User's proposed criteria before seeing AI framework. */
  userProposedCriteria?: { name: string; rationale: string }[] | null;
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
}

export interface EvaluativeCriterion {
  id: string;
  label: string;
  description: string;
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

/** Weighted scoring table (3+ criteria). */
export interface EvaluativeScoringRow {
  id: string;
  type: "evaluative";
  variant: "scoring";
  domain: string;
  title: string;
  scenario: string;
  /** User's proposed criteria before seeing AI framework. */
  userProposedCriteria?: { name: string; rationale: string }[] | null;
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
}

export type EvaluativeExerciseRow = EvaluativeMatrixRow | EvaluativeScoringRow;

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
  title: string;
  scenario: string;
  subExercises: ComboSubExercise[];
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
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
