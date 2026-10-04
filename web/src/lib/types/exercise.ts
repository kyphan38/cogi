import type { AnalyticalExercise } from "@/lib/ai/validators/common";
import type { EvaluativeQuadrant } from "@/lib/ai/validators/evaluative";
import type { SystemsConnectionType } from "@/lib/ai/validators/systems";
import type { SystemsExercisePayload } from "@/lib/ai/validators/systems";
import type { SystemsResilienceExercisePayload } from "@/lib/ai/validators/systems";
import type { SystemsTaskType } from "@/lib/ai/validators/systems";
import type { AIPerspectiveStructured, AnalyticalDeepDive } from "@/lib/types/perspective";
import type { PracticeLevel } from "@/lib/exercise/levels";
import type { GeoLens } from "@/lib/exercise/analytical-levels";
import type { GeoGuessResult } from "@/lib/exercise/geo-guess";
import type { SystemsResult } from "@/lib/exercise/systems-score";
import type { EvaluativeResult } from "@/lib/exercise/evaluative-score";
import type { JudgmentResult } from "@/lib/exercise/judgment-score";
import type { StrategyAnswers, StrategyResult } from "@/lib/exercise/strategy-score";
import type { StrategyExercisePayload } from "@/lib/ai/validators/strategy";
import type { JudgmentContext } from "@/lib/exercise/judgment-levels";
import type { ReframeResult } from "@/lib/exercise/reframe-score";
import type { ReframeAnswer, ReframeExercisePayload } from "@/lib/ai/validators/reframe";
import type { CalibrationItem, CalibrationTopic } from "@/lib/exercise/calibration-math";
import type { CalibrationAnswer, CalibrationResult } from "@/lib/exercise/calibration-score";
import type { CALIBRATION_CONCEPTS, CALIBRATION_CHECKS } from "@/lib/exercise/calibration-levels";
import type { GeoQuizAnswer } from "@/lib/geo/quiz";
import type { StraitResult } from "@/lib/geo/strait";
import type { ChokepointId, RouteId } from "@/lib/geo/chokepoints";
import type { TimelineResult } from "@/lib/geo/timelines";
import type {
  JudgmentChoiceQuestion,
  JudgmentConcept,
  JudgmentLens,
  JudgmentLensQuestion,
  JudgmentResponse,
} from "@/lib/ai/validators/judgment";

/** The exercise types the app offers. Old rows of removed types may still exist in Firestore. */
export type ThinkingType = "analytical" | "systems" | "evaluative" | "judgment" | "strategy" | "reframe" | "calibration";

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

export interface MainClaimQuiz {
  options: string[];
  answerIndex: number;
  explanation: string;
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
  /** Geopolitics learning extras (PLAN-geopolitics.md G1). Older rows lack them. */
  concepts?: NonNullable<AnalyticalExercise["concepts"]>;
  conceptChecks?: NonNullable<AnalyticalExercise["conceptChecks"]>;
  conceptAnswers?: number[];
  /** Geopolitics: "Learn first" finished, so the passage shows. */
  learnDone?: boolean;
  perspectiveOptions?: string[];
  /** Index into `perspectiveOptions` (original order). */
  perspectiveChoice?: number | null;
  actorCandidates?: string[];
  actorChoices?: string[];
  lensQuestions?: NonNullable<AnalyticalExercise["lensQuestions"]>;
  lensAnswers?: Partial<Record<GeoLens, number>>;
  /** Expert: one sentence per lens. */
  lensText?: Partial<Record<GeoLens, string>>;
  /** Scored in code when feedback was requested. */
  geoGuess?: GeoGuessResult | null;
  embeddedIssues: EmbeddedIssue[];
  validPoints: ValidPoint[];
  userHighlights: UserHighlight[];
  /** Highlights scored against the answer key when submitted. Older rows lack it. */
  result?: AnalyticalResult | null;
  /** Practice level the exercise was made for. Older rows lack it. */
  level?: PracticeLevel;
  /** Guided level: pick the main claim before checking sentences. */
  mainClaimQuiz?: MainClaimQuiz;
  /** Index into `mainClaimQuiz.options` the user picked (not the shuffled position). */
  mainClaimAnswer?: number | null;
  /** Guided walkthrough: which suggested sentence the user is on. */
  guidedIndex?: number;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  /** "Go deeper" analyses the user asked for, keyed by coaching ref (`issue_1`, `decoy_2`). */
  deepDives?: Record<string, AnalyticalDeepDive>;
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
  /** Geopolitics G1: parts the user predicted the shock hits directly from B's view, before seeing it. */
  predictedDirectB?: string[];
  /** B's map has been shown (the prediction is locked). */
  revealedB?: boolean;
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
  /** Map and impact scored against the model when feedback was requested. */
  result?: SystemsResult | null;
  /** Practice level the exercise was made for. Older rows lack it. */
  level?: PracticeLevel;
  userEdges: SystemsUserEdge[];
  /** Per node_id impact assessment after shock. */
  nodeImpact: Record<string, SystemsNodeImpact>;
  /** Indirect node id -> the node the user says the shock comes through. */
  impactVia?: Record<string, string>;
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
  /** Work compared with the model when feedback was requested. */
  result?: EvaluativeResult | null;
  /** Practice level the exercise was made for. Older rows lack it. */
  level?: PracticeLevel;
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
  /** Work compared with the model when feedback was requested. */
  result?: EvaluativeResult | null;
  /** Practice level the exercise was made for. Older rows lack it. */
  level?: PracticeLevel;
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
  /** Work compared with the model when feedback was requested. */
  result?: EvaluativeResult | null;
  /** Practice level the exercise was made for. Older rows lack it. */
  level?: PracticeLevel;
}

export type EvaluativeExerciseRow = EvaluativeMatrixRow | EvaluativeScoringRow | EvaluativeUncertaintyRow;

/** Life situation read through three lenses (PLAN-learning.md L1). */
export interface JudgmentExerciseRow {
  id: string;
  type: "judgment";
  /** Area of life, e.g. Work or Family. */
  domain: string;
  context: JudgmentContext;
  /** "My situation": what really happened, in the user's words. */
  customScenario?: string;
  title: string;
  scenario: string;
  concepts: JudgmentConcept[];
  conceptChecks: JudgmentChoiceQuestion[];
  lensQuestions: JudgmentLensQuestion[];
  responses: JudgmentResponse[];
  level: PracticeLevel;
  /** Where the user is inside the work step, for resuming. */
  part?: "learn" | "lenses" | "respond";
  /** Picked option index per concept check (original index, not the shuffled position). */
  conceptAnswers?: number[];
  /** Picked option index per lens (choice levels). */
  lensAnswers?: Partial<Record<JudgmentLens, number>>;
  /** Free-text readings per lens (Expert). */
  lensText?: Partial<Record<JudgmentLens, string>>;
  /** Response ids, best first. */
  userOrder?: string[];
  /** Why the first choice, in one or two sentences. */
  userWhy?: string;
  /** Expert: the user's own way to respond. */
  ownResponse?: string;
  result?: JudgmentResult | null;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

/** Strategic situation: a 2-player game in a real story (PLAN-learning.md L2). */
export interface StrategyExerciseRow {
  id: string;
  type: "strategy";
  /** Topic area, e.g. Business & prices. */
  domain: string;
  title: string;
  scenario: string;
  concepts: StrategyExercisePayload["concepts"];
  conceptChecks: StrategyExercisePayload["conceptChecks"];
  players: StrategyExercisePayload["players"];
  optionsA: StrategyExercisePayload["optionsA"];
  optionsB: StrategyExercisePayload["optionsB"];
  cells: StrategyExercisePayload["cells"];
  /** The model's own label; not shown as fact (the code computes the game). */
  gameType: string;
  insight: string;
  /** Geopolitical games (PLAN-geopolitics.md G3): the real case this made-up story is shaped on. */
  geoCaseId?: string;
  level: PracticeLevel;
  part?: "learn" | "analyze" | "predict";
  conceptAnswers?: number[];
  answers?: StrategyAnswers;
  /** Why the user predicts that outcome. */
  userWhy?: string;
  result?: StrategyResult | null;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

/** Reframe: spot thinking traps, then rewrite a thought (PLAN-psychology.md P1). */
export interface ReframeExerciseRow {
  id: string;
  type: "reframe";
  /** Area of life, e.g. Work or Family. */
  domain: string;
  context: JudgmentContext;
  /** "My situation": what really happened, in the user's words. */
  customScenario?: string;
  title: string;
  scenario: string;
  concepts: ReframeExercisePayload["concepts"];
  conceptChecks: ReframeExercisePayload["conceptChecks"];
  thoughts: ReframeExercisePayload["thoughts"];
  rewrite: ReframeExercisePayload["rewrite"];
  level: PracticeLevel;
  /** Where the user is inside the work step, for resuming. */
  part?: "learn" | "spot" | "reframe";
  conceptAnswers?: number[];
  /** The feeling the user names first (one word from the list), and how strong, 0-100. */
  feeling?: string;
  intensityBefore?: number;
  /** How strong the feeling is after the rewrite. Not scored. */
  intensityAfter?: number;
  /** Thought id -> the trap the user picked, or "realistic". Guided keeps the first pick. */
  answers?: Partial<Record<string, ReframeAnswer>>;
  /** Guided: the rewrite option picked (original index, not the shuffled position). */
  rewriteChoice?: number | null;
  /** Expert: evidence for and against the thought before rewriting it. */
  evidenceFor?: string;
  evidenceAgainst?: string;
  /** Standard and Expert: the user's own balanced thought. */
  balancedThought?: string;
  result?: ReframeResult | null;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

/** Calibration: how sure vs how right (PLAN-psychology.md P2). Built in code, not by the AI. */
export interface CalibrationExerciseRow {
  id: string;
  type: "calibration";
  /** The topic of the questions ("Mixed" or a bank category). */
  domain: CalibrationTopic;
  title: string;
  /** Snapshot of the questions, so later bank edits never change an old exercise. */
  items: CalibrationItem[];
  concepts: (typeof CALIBRATION_CONCEPTS)[number][];
  conceptChecks: (typeof CALIBRATION_CHECKS)[number][];
  level: PracticeLevel;
  part?: "learn" | "answer";
  conceptAnswers?: number[];
  answers?: Partial<Record<string, CalibrationAnswer>>;
  result?: CalibrationResult | null;
  confidenceBefore: number | null;
  aiPerspective: string | null;
  aiPerspectiveStructured?: AIPerspectiveStructured | null;
  createdAt: string;
  completedAt: string | null;
  currentStep?: number;
  /** Optional one-line "what I take away", written at the end. */
  takeaway?: string | null;
}

/** The AI's short note after "Close the strait"; it may only use the fixed facts. */
export interface GeoStraitExplanation {
  summary: string;
  points: string[];
}

/**
 * Geo Lab (PLAN-geopolitics.md G2): a daily map quiz or one "Close the strait" round.
 * Built in code from fixed, sourced data; saved only when finished. Not a practice
 * type: it has no page under /exercise and no level.
 */
export interface GeoLabExerciseRow {
  id: string;
  type: "geo";
  variant: "map_quiz" | "strait" | "timeline";
  /** Always "Geo Lab"; kept out of topic suggestions. */
  domain: string;
  title: string;
  /** map_quiz: the answers, in the order asked. */
  quiz?: GeoQuizAnswer[];
  /** strait: what the user guessed and how it scored. */
  strait?: {
    chokepointId: ChokepointId;
    picked: string[];
    route: RouteId | null;
    result: StraitResult;
    explanation?: GeoStraitExplanation | null;
  };
  /** timeline: decisions, order and off-ramp answers (PLAN-geopolitics.md G4). */
  timeline?: TimelineResult;
  confidenceBefore: null;
  aiPerspective: null;
  /** Shared row fields; Geo Lab rows never use them. */
  aiPerspectiveStructured?: null;
  currentStep?: number;
  createdAt: string;
  completedAt: string | null;
}

export type Exercise =
  | GeoLabExerciseRow
  | AnalyticalExerciseRow
  | SystemsExerciseRow
  | EvaluativeExerciseRow
  | JudgmentExerciseRow
  | StrategyExerciseRow
  | ReframeExerciseRow
  | CalibrationExerciseRow;

export function isGeoLabExercise(ex: Exercise): ex is GeoLabExerciseRow {
  return ex.type === "geo";
}

export function isCalibrationExercise(ex: Exercise): ex is CalibrationExerciseRow {
  return ex.type === "calibration";
}

export function isReframeExercise(ex: Exercise): ex is ReframeExerciseRow {
  return ex.type === "reframe";
}

export function isStrategyExercise(ex: Exercise): ex is StrategyExerciseRow {
  return ex.type === "strategy";
}

export function isJudgmentExercise(ex: Exercise): ex is JudgmentExerciseRow {
  return ex.type === "judgment";
}

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
