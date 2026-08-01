export type Topic =
  | "expected_value"
  | "graph_theory"
  | "game_theory"
  | "probability_bayes"
  | "causal_literacy"
  | "exponential_power_law";

export type CommitKind = "numeric" | "multiple_choice" | "ranged_estimate";

export interface OptionSpec {
  id: string;
  text: string;
}

export interface MachineCheckableCommitSpec {
  kind: CommitKind;
  promptText: string;
  unit?: string;                // e.g. "$/yr", "%", "hours"
  targetValue?: number;         // Exact canonical target
  tolerance?: number;           // Allowed delta |user - target|
  acceptableRange?: [number, number]; // Min/max bounds
  correctOptionId?: string;     // For multiple choice
  options?: OptionSpec[];
}

export interface CrossDomainTransfer {
  domain: string;
  mapping: string;
}

export interface FailureBoundary {
  condition: string;
  whyItBreaks: string;
}

export interface MonteCarloCheck {
  scriptPath: string;
  expected: number;
  tolerance: number;
}

export interface Scenario {
  id: string;
  topic: Topic;
  title: string;

  // STEP 1 - DROP
  situation: string;

  // STEP 2 - COMMIT (Machine-checkable)
  commitSpec: MachineCheckableCommitSpec;

  // STEP 3 - STRUGGLE (Tutor-safe guidance)
  keyTraps: string[];
  hintLadder: string[];

  // STEP 4 - REVEAL
  canonicalAnswer: string;
  explanation: string;
  toolName: string;
  transfers: CrossDomainTransfer[];
  boundaries: FailureBoundary[];

  // Verification & Real-life takeaway
  verification?: MonteCarloCheck;
  fieldNote: string;
}

export interface CalibrationBin {
  binLabel: string;
  minConfidence: number;
  maxConfidence: number;
  attemptCount: number;
  actualAccuracy: number;        // Ratio 0.00 - 1.00
}

export type LoopState =
  | "drop"
  | "commit"
  | "struggle"
  | "reveal_answer"
  | "reveal_boundary_predict"
  | "reveal_boundary_full"
  | "teach_back"
  | "complete";

export interface Attempt {
  scenarioId: string;
  predictionText?: string;
  committedValue: number | string;
  confidence: number;            // 0.00 to 1.00
  correct: boolean;              // Evaluated deterministically via commitSpec
  userBoundaryGuess?: string;
  createdAt: string;
}

export interface TutorRequestPayload {
  scenarioId: string;
  situation: string;
  userCurrentThinking: string;
  keyTraps: string[];
  hintLadder: string[];
  conversationHistory: Array<{ sender: "user" | "tutor"; message: string }>;
}

export interface StudentRequestPayload {
  scenarioId: string;
  situation: string;
  toolName: string;
  fieldNote: string;
  userExplanation: string;
  conversationHistory: Array<{ sender: "user" | "student"; message: string }>;
}
