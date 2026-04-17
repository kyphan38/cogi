import type { AdaptiveExerciseType, AdaptiveHintsPayload, DifficultyTierLabel } from "@/lib/adaptive/types";

const TIERS = new Set<DifficultyTierLabel>([
  "Foundation",
  "Practitioner",
  "Advanced",
  "Expert",
]);

const EX_TYPES = new Set<AdaptiveExerciseType>([
  "analytical",
  "sequential",
  "systems",
  "evaluative",
  "generative",
]);

function isTier(v: unknown): v is DifficultyTierLabel {
  return typeof v === "string" && TIERS.has(v as DifficultyTierLabel);
}

function isExerciseType(v: unknown): v is AdaptiveExerciseType {
  return typeof v === "string" && EX_TYPES.has(v as AdaptiveExerciseType);
}

export function normalizeAdaptiveHints(raw: unknown): AdaptiveHintsPayload | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.enabled !== true) return null;
  if (!isExerciseType(o.exerciseType)) return null;
  const tier = o.tier === null || o.tier === undefined ? null : isTier(o.tier) ? o.tier : null;
  const rollingAccuracy =
    typeof o.rollingAccuracy === "number" && Number.isFinite(o.rollingAccuracy)
      ? Math.max(0, Math.min(100, Math.round(o.rollingAccuracy)))
      : null;
  const sampleCount =
    typeof o.sampleCount === "number" && Number.isFinite(o.sampleCount)
      ? Math.max(0, Math.floor(o.sampleCount))
      : 0;
  const w = o.weaknessTypesToInject;
  const weaknessTypesToInject = Array.isArray(w)
    ? w.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 6)
    : [];
  return {
    enabled: true,
    exerciseType: o.exerciseType,
    tier,
    rollingAccuracy,
    sampleCount,
    weaknessTypesToInject,
  };
}

function tierGuidance(exerciseType: AdaptiveExerciseType, tier: DifficultyTierLabel | null): string {
  if (!tier) {
    return "Insufficient local history for a tier label — keep difficulty neutral and well-structured.";
  }
  if (exerciseType === "analytical") {
    if (tier === "Foundation") {
      return "Learner band: Foundation. Keep the required issue counts/severities, but use clearer prose, shorter sentences, and issues that are easier to separate from decoys.";
    }
    if (tier === "Practitioner") {
      return "Learner band: Practitioner. Balanced difficulty; one subtle issue may require careful reading.";
    }
    if (tier === "Advanced") {
      return "Learner band: Advanced. Denser argumentation; subtle issue should be genuinely hard to separate from decoys while still fair.";
    }
    return "Learner band: Expert. Maximum nuance; subtle issue should demand close reading and integration of multiple cues (still fair, still matching the JSON shape).";
  }
  if (exerciseType === "sequential") {
    if (tier === "Foundation" || tier === "Practitioner") {
      return `Learner band: ${tier}. Keep 8 steps and dependency rules, but make the true order more inferable; keep the trap step learnable.`;
    }
    if (tier === "Advanced") {
      return "Learner band: Advanced. Tighter plausible alternative orderings; trap step should be less obvious but still fair.";
    }
    return "Learner band: Expert. Emphasize subtle dependency traps and credible decoy ordering paths (still exactly 8 steps).";
  }
  if (exerciseType === "systems") {
    if (tier === "Foundation" || tier === "Practitioner") {
      return `Learner band: ${tier}. Keep exactly 6 nodes and the feedback loop requirement; favor clearer intended connections and shock ripple logic.`;
    }
    if (tier === "Advanced") {
      return "Learner band: Advanced. Richer interplay between nodes; shock ripple slightly less obvious but still deducible.";
    }
    return "Learner band: Expert. Dense causal web; shock ripple should require careful tracing (still 6 nodes, same ids).";
  }
  if (exerciseType === "evaluative") {
    if (tier === "Foundation" || tier === "Practitioner") {
      return `Learner band: ${tier}. Keep matrix vs scoring rules; favor clearer axis/criterion definitions and less ambiguous option placements/scores.`;
    }
    if (tier === "Advanced") {
      return "Learner band: Advanced. Tighter trade-offs; options should be closer calls while remaining defensible.";
    }
    return "Learner band: Expert. Maximize genuinely hard trade-offs without breaking variant-specific constraints.";
  }
  return `Learner band: ${tier}. For generative stage rules, tune question depth and how demanding the expected answers are — without changing required counts or stage-specific fields.`;
}

/**
 * Appended to generation prompts on the server. Must never contradict Zod / fixed counts.
 */
export function buildAdaptationAppendix(
  hints: AdaptiveHintsPayload | null,
  exerciseType: AdaptiveExerciseType,
): string | undefined {
  if (!hints?.enabled || hints.exerciseType !== exerciseType) return undefined;
  const perf =
    hints.rollingAccuracy != null && hints.sampleCount > 0
      ? `Recent measured accuracy (rolling mean): ~${hints.rollingAccuracy}% over ${hints.sampleCount} completed exercise(s) in this browser.`
      : "Recent performance data is sparse; avoid over-tuning difficulty.";
  const tierLine = tierGuidance(exerciseType, hints.tier);
  const weak =
    hints.weaknessTypesToInject.length > 0
      ? `Weakness emphasis: where compatible with ALL hard structural requirements, foreground practice relevant to: ${hints.weaknessTypesToInject.join(", ")}.`
      : "";
  return [
    "--- Adaptive guidance (do not violate any required counts, enums, or JSON shapes above) ---",
    perf,
    tierLine,
    weak,
  ]
    .filter(Boolean)
    .join("\n");
}
