import type { SandboxDecisionInput, SandboxEvResult } from "@/lib/types/sandbox";

/**
 * Pure, deterministic EV + ruin-risk evaluation for sandbox mode.
 * No AI involvement: this is the one function whose output is treated as
 * the authoritative number in the sandbox flow (see StepSandboxChallenge prompt,
 * which is only ever handed this result to discuss, never asked to compute it).
 */
export function computeSandboxEv(input: SandboxDecisionInput): SandboxEvResult {
  const weightedSum = input.branches.reduce(
    (sum, b) => sum + b.probability * b.payoff,
    0,
  );
  const ev = round2(weightedSum - input.fixedCost);

  const worstBranchPayoff = input.branches.reduce(
    (worst, b) => Math.min(worst, b.payoff),
    0,
  );
  const worstLoss = Math.max(0, -worstBranchPayoff);

  const ruinFlag = input.oneShot && worstLoss > input.reserves;
  const ruinReason = ruinFlag
    ? `This is marked one-shot, and the worst branch loses ${formatUsd(worstLoss)}, which exceeds your stated reserves of ${formatUsd(input.reserves)}. A positive average does not protect you from an outcome you can't survive — expected value alone is not sufficient here.`
    : null;

  return { ev, ruinFlag, ruinReason };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
