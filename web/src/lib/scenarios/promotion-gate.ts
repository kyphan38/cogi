export const NOT_IMPLEMENTED_SENTINEL = "NOT_IMPLEMENTED_VERIFY_THIS_DRAFT";

export interface PromotionGateInput {
  draftExists: boolean;
  verifierFileExists: boolean;
  /** True if the verifier file still contains the unfilled-stub sentinel. */
  verifierHasSentinel: boolean;
  /** null = not run (e.g. an earlier gate already failed). */
  verifierPassed: boolean | null;
  auditPass: boolean;
  auditFailures: string[];
  /** The human explicitly ran the script with --confirm naming this exact draft id. */
  confirmed: boolean;
}

export interface PromotionGateResult {
  allowed: boolean;
  reasons: string[];
}

/**
 * Pure decision function for scripts/promote-scenario.ts. Kept separate from filesystem
 * and process I/O so the refusal logic can be unit-tested deterministically and offline.
 * Promotion is allowed if and only if every gate passes - there is no override.
 */
export function evaluatePromotionGate(input: PromotionGateInput): PromotionGateResult {
  const reasons: string[] = [];

  if (!input.draftExists) {
    reasons.push("No draft file found with this id under src/lib/scenarios/drafts/.");
  }
  if (!input.verifierFileExists) {
    reasons.push(
      "No companion *.verify.test.ts file found - a quantitative draft cannot be promoted without a Monte Carlo verifier.",
    );
  } else if (input.verifierHasSentinel) {
    reasons.push(
      `Verifier still contains the ${NOT_IMPLEMENTED_SENTINEL} sentinel - a human must implement and pass it before promotion.`,
    );
  } else if (input.verifierPassed !== true) {
    reasons.push("Verifier did not pass (or was not run).");
  }

  if (!input.auditPass) {
    reasons.push(`Automated audit failed: ${input.auditFailures.join("; ") || "(no details)"}`);
  }

  if (!input.confirmed) {
    reasons.push(
      "Promotion requires an explicit --confirm <draft-id> from a human; refusing to promote automatically.",
    );
  }

  return { allowed: reasons.length === 0, reasons };
}
