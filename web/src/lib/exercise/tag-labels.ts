import type { TagType } from "@/lib/types/exercise";

export type GeopoliticsSemanticTagType =
  | "framing_bias"
  | "missing_actor"
  | "assumed_causation"
  | "analogy_misuse";

export const GEOPOLITICS_SEMANTIC_ACCENTS: Record<
  GeopoliticsSemanticTagType,
  { label: string; dotClass: string; chipClass: string }
> = {
  framing_bias: {
    label: "Framing Bias",
    dotClass: "bg-semantic-framing",
    chipClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  missing_actor: {
    label: "Missing Actor / Perspective",
    dotClass: "bg-semantic-missing-actor",
    chipClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  assumed_causation: {
    label: "Assumed Causation",
    dotClass: "bg-semantic-assumed-causation",
    chipClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  analogy_misuse: {
    label: "Analogy Misuse",
    dotClass: "bg-semantic-analogy-misuse",
    chipClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
};

/**
 * Markers for the two tags that are not problems, so every row in the geopolitics
 * picker lines up. Colour stays reserved for the four problem types: a hollow ring
 * means "no problem here", a grey dot means "not decided".
 */
export const NEUTRAL_TAG_MARKERS: Record<"valid_point" | "unclear", string> = {
  valid_point: "border border-zinc-500 bg-transparent",
  unclear: "bg-zinc-300",
};

export function tagMarkerClass(tag: TagType): string | null {
  if (tag === "valid_point" || tag === "unclear") return NEUTRAL_TAG_MARKERS[tag];
  return tag in GEOPOLITICS_SEMANTIC_ACCENTS
    ? GEOPOLITICS_SEMANTIC_ACCENTS[tag as GeopoliticsSemanticTagType].dotClass
    : null;
}

export const GEOPOLITICS_SEMANTIC_TAG_SET = new Set<TagType>(
  Object.keys(GEOPOLITICS_SEMANTIC_ACCENTS) as GeopoliticsSemanticTagType[],
);

export function isGeopoliticsSemanticTag(
  tag: TagType,
): tag is GeopoliticsSemanticTagType {
  return GEOPOLITICS_SEMANTIC_TAG_SET.has(tag);
}

export function isGeopoliticsSemanticTagOptions(
  options: TagType[],
): boolean {
  return (
    options.length > 0 &&
    options.every((t) => GEOPOLITICS_SEMANTIC_TAG_SET.has(t))
  );
}

export const TAG_LABELS: Record<
  TagType,
  { label: string; colorClass: string }
> = {
  logical_fallacy: {
    label: "Logical Fallacy",
    colorClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  hidden_assumption: {
    label: "Hidden Assumption",
    colorClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  weak_evidence: {
    label: "Weak Evidence",
    colorClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  bias: {
    label: "Bias / Motivated Reasoning",
    colorClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  framing_bias: {
    label: GEOPOLITICS_SEMANTIC_ACCENTS.framing_bias.label,
    colorClass: GEOPOLITICS_SEMANTIC_ACCENTS.framing_bias.chipClass,
  },
  missing_actor: {
    label: GEOPOLITICS_SEMANTIC_ACCENTS.missing_actor.label,
    colorClass: GEOPOLITICS_SEMANTIC_ACCENTS.missing_actor.chipClass,
  },
  assumed_causation: {
    label: GEOPOLITICS_SEMANTIC_ACCENTS.assumed_causation.label,
    colorClass: GEOPOLITICS_SEMANTIC_ACCENTS.assumed_causation.chipClass,
  },
  analogy_misuse: {
    label: GEOPOLITICS_SEMANTIC_ACCENTS.analogy_misuse.label,
    colorClass: GEOPOLITICS_SEMANTIC_ACCENTS.analogy_misuse.chipClass,
  },
  valid_point: {
    label: "Valid Point",
    colorClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
  unclear: {
    label: "Unclear / Needs More Info",
    colorClass: "border border-zinc-200 bg-zinc-50 text-zinc-800",
  },
};

/**
 * The question behind each problem tag: a "yes" answer means the tag fits. Shown when
 * tagging and used by the AI feedback, so both speak the same words.
 */
export const TAG_CHECK_QUESTIONS: Partial<Record<TagType, string>> = {
  weak_evidence: "Is there real evidence here, or only a claim?",
  hidden_assumption: "Does this quietly assume something that was never shown to be true?",
  logical_fallacy: "Does the logic jump? (only two options, a conclusion too far from the facts)",
  bias: "Does the writer see only one side, or gain from this view?",
  framing_bias: "Does the text treat one side's interests as the normal, reasonable view?",
  missing_actor: "Who is affected but never mentioned?",
  assumed_causation: "Does it say A caused B only because B came after A?",
  analogy_misuse: "Does the historical comparison really fit this case?",
};

/** Tags shown when highlighting plain analytical passages (the issue types they embed). */
export const ANALYTICAL_TAG_OPTIONS: TagType[] = [
  "logical_fallacy",
  "hidden_assumption",
  "weak_evidence",
  "bias",
  "valid_point",
  "unclear",
];

/** Tags shown when highlighting geopolitics analytical passages. */
export const GEOPOLITICS_TAG_OPTIONS: TagType[] = [
  "framing_bias",
  "missing_actor",
  "assumed_causation",
  "analogy_misuse",
  "valid_point",
  "unclear",
];
