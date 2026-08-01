/**
 * Sandbox mode: practice the EV frame on a real, user-supplied decision.
 * Never scored, never calibrated — see src/lib/sandbox/compute-ev.ts for the
 * deterministic (non-AI) math and src/app/(main)/math/sandbox/page.tsx for the flow.
 */

export interface SandboxBranch {
  id: string;
  /** Short human label, e.g. "Outage occurs". */
  label: string;
  /** 0..1, owned and edited by the user — this is the base-rate lesson in practice. */
  probability: number;
  /** Signed dollar outcome for this branch (positive = gain, negative = loss). */
  payoff: number;
}

export interface SandboxDecisionInput {
  decisionText: string;
  branches: SandboxBranch[];
  /** Fixed/recurring cost of taking the option being evaluated (0 if none). */
  fixedCost: number;
  /** true = single irreversible decision; false = repeated/many independent trials. */
  oneShot: boolean;
  /** Available reserves/bankroll that would have to absorb a bad branch. */
  reserves: number;
}

export interface SandboxEvResult {
  /** sum(probability * payoff) - fixedCost. Computed by code, never by the model. */
  ev: number;
  /** true only when oneShot AND the worst-case branch loss exceeds reserves. */
  ruinFlag: boolean;
  ruinReason: string | null;
}

/**
 * AI's proposed decomposition of the user's free-text decision. Every field here is a
 * *draft* the user must edit/confirm — the structuring prompt is forbidden from asserting
 * an EV, a recommendation, or a verdict. This type intentionally has no `ev` field.
 */
export interface SandboxStructuringProposal {
  /** 1-2 sentence restatement of the decision, to confirm the model understood it. */
  summary: string;
  branches: SandboxBranch[];
  fixedCost: number;
  oneShot: boolean;
  /** Best-effort guess at reserves if mentioned in the user's text; 0 if not stated. */
  reserves: number;
  /** Caveats/uncertainties the model wants to flag about its own draft numbers. */
  notes: string;
}

export interface SandboxChallengeMessage {
  sender: "user" | "challenger";
  message: string;
}
