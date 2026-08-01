import type { SandboxBranch, SandboxDecisionInput, SandboxEvResult, SandboxValidity } from "@/lib/types/sandbox";

/** Tolerance for floating-point noise when checking that probabilities sum to 1. */
const PROBABILITY_SUM_EPSILON = 1e-9;

/**
 * Pure, deterministic EV + ruin-risk evaluation for sandbox mode.
 * No AI involvement: this is the one function whose output is treated as
 * the authoritative number in the sandbox flow (see StepSandboxChallenge prompt,
 * which is only ever handed this result to discuss, never asked to compute it).
 *
 * Refuses to compute a number from an incoherent branch distribution (missing branches,
 * an out-of-range probability, or probabilities that don't sum to 100%) - see `validity`.
 * A silently-clamped or silently-wrong EV would defeat the point of a rigor-teaching tool.
 */
export function computeSandboxEv(input: SandboxDecisionInput): SandboxEvResult {
  const validity = validateBranches(input.branches);
  if (!validity.ok) {
    return { ev: null, ruinFlag: false, ruinReason: null, validity };
  }

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
    ? `This is marked one-shot, and the worst branch loses ${formatUsd(worstLoss)}, which exceeds your stated reserves of ${formatUsd(input.reserves)}. A positive average does not protect you from an outcome you can't survive - expected value alone is not sufficient here.`
    : null;

  return { ev, ruinFlag, ruinReason, validity };
}

function validateBranches(branches: SandboxBranch[]): SandboxValidity {
  if (branches.length === 0) {
    return { ok: false, reason: "No outcome branches are defined yet." };
  }

  for (const b of branches) {
    if (b.probability < 0 || b.probability > 1) {
      return {
        ok: false,
        reason: `"${b.label}" has an invalid probability (${formatPct(b.probability)}) - each branch's probability must be between 0% and 100%.`,
      };
    }
  }

  const sum = branches.reduce((s, b) => s + b.probability, 0);
  if (Math.abs(sum - 1) > PROBABILITY_SUM_EPSILON) {
    return {
      ok: false,
      reason: `Branch probabilities sum to ${formatPct(sum)}, not 100% - the branches must fully partition the outcome space.`,
    };
  }

  return { ok: true, reason: null };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
