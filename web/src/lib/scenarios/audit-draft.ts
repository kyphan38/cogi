import type { Scenario } from "@/lib/types/math-scenario";

export interface ScenarioAuditResult {
  pass: boolean;
  failures: string[];
}

/**
 * Patterns that indicate an option label leaks the reasoning/answer instead of stating a
 * bare choice. Extends the regex set from expected-value.test.ts with raw-number leakage,
 * since a label containing a dollar figure or percentage is a stronger tell than any of the
 * original words alone.
 */
export const LABEL_LEAKAGE_PATTERNS: RegExp[] = [
  /focus on/i,
  /based on/i,
  /\bev\b/i,
  /\bexpected value\b/i,
  /reserves/i,
  /\boptimal\b/i,
  /\bcorrect\b/i,
  /best choice/i,
  /\bsafer\b/i,
  /\brisk(ier|y)\b/i,
];
// Deliberately NOT flagging bare dollar/percent figures: a label like "Pay $60,000 for a
// user study" states the cost of the action itself (needed to distinguish it from the other
// options), not the computed EV or the verdict - see the prior manual review of
// ev-value-of-information's options, which confirmed this is not a leak.

/**
 * Deterministic, mechanically-checkable subset of the review checklist. This function
 * catches structural failures (missing fields, leaked labels, an uncomputed answer, a
 * dangling correctness gate, a cloned reasoning move) - it does NOT and cannot prove the
 * math is right. That is the job of the mandatory Monte Carlo verifier required before
 * promotion (see scripts/promote-scenario.ts); this audit is a fast, offline pre-filter,
 * not a substitute for it.
 */
export function auditScenarioDraft(
  draft: Scenario,
  existingScenarios: Scenario[],
): ScenarioAuditResult {
  const failures: string[] = [];

  // --- distinct reasoning move (not a clone) ---------------------------------
  const draftTool = draft.toolName.trim().toLowerCase();
  const clone = existingScenarios.find((s) => s.toolName.trim().toLowerCase() === draftTool);
  if (clone) {
    failures.push(
      `Reasoning move is not distinct: toolName "${draft.toolName}" duplicates existing scenario "${clone.id}". A draft must name and teach a different reasoning move.`,
    );
  }

  // --- neutral option labels --------------------------------------------------
  if (draft.commitSpec.kind === "multiple_choice") {
    for (const opt of draft.commitSpec.options ?? []) {
      for (const pattern of LABEL_LEAKAGE_PATTERNS) {
        if (pattern.test(opt.text)) {
          failures.push(
            `Option label leaks the answer: "${opt.text}" matches leakage pattern ${pattern}.`,
          );
        }
      }
    }
    if (!draft.commitSpec.options || draft.commitSpec.options.length < 2) {
      failures.push("multiple_choice commitSpec must have at least 2 options.");
    }
  }

  // --- commitSpec correctness gate is wired up --------------------------------
  if (draft.commitSpec.kind === "multiple_choice") {
    const options = draft.commitSpec.options ?? [];
    const correctOption = options.find((o) => o.id === draft.commitSpec.correctOptionId);
    if (!draft.commitSpec.correctOptionId || !correctOption) {
      failures.push(
        "commitSpec.correctOptionId is missing or does not match any option id - the scoring gate would never resolve to correct.",
      );
    } else {
      const overlap = sharedSignificantWords(correctOption.text, draft.canonicalAnswer);
      if (overlap.length === 0) {
        failures.push(
          `commitSpec.correctOptionId ("${correctOption.text}") shares no words with canonicalAnswer ("${draft.canonicalAnswer}") - the scored-correct option and the stated answer appear inconsistent.`,
        );
      }
    }
  } else {
    if (draft.commitSpec.targetValue === undefined && !draft.commitSpec.acceptableRange) {
      failures.push(
        "Numeric commitSpec must define targetValue+tolerance or acceptableRange for the scoring gate to work.",
      );
    }
  }

  // --- answer is derived, not merely asserted (heuristic floor) --------------
  if (!draft.explanation.includes("=")) {
    failures.push(
      "explanation contains no '=' - it does not visibly show a calculation producing canonicalAnswer.",
    );
  }
  if (extractNumbers(draft.explanation).length < 2) {
    failures.push(
      "explanation contains fewer than 2 numeric values - a derivation should combine at least two numbers.",
    );
  }

  // --- self-contained (heuristic floor, not exhaustive) -----------------------
  if (extractNumbers(draft.situation).length === 0) {
    failures.push("situation contains no numeric figures - it cannot pose a quantitative decision.");
  }
  if (draft.situation.trim().length < 40) {
    failures.push("situation is too short to plausibly state a complete decision.");
  }

  // --- structural completeness -------------------------------------------------
  if (draft.keyTraps.length === 0) failures.push("keyTraps must not be empty.");
  if (draft.hintLadder.length === 0) failures.push("hintLadder must not be empty.");
  if (draft.transfers.length === 0) failures.push("transfers must not be empty.");
  if (draft.boundaries.length === 0) failures.push("boundaries must not be empty.");

  return { pass: failures.length === 0, failures };
}

function extractNumbers(text: string): string[] {
  return text.match(/\d[\d,]*(\.\d+)?/g) ?? [];
}

function sharedSignificantWords(a: string, b: string): string[] {
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4),
  );
  const wordsB = b
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  return wordsB.filter((w) => wordsA.has(w));
}
