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
    colorClass: "bg-red-600 text-white border-red-700",
  },
  hidden_assumption: {
    label: "Hidden Assumption",
    colorClass: "bg-orange-500 text-white border-orange-600",
  },
  weak_evidence: {
    label: "Weak Evidence",
    colorClass: "bg-yellow-500 text-black border-yellow-600",
  },
  bias: {
    label: "Bias / Motivated Reasoning",
    colorClass: "bg-purple-600 text-white border-purple-700",
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
    colorClass: "bg-green-600 text-white border-green-700",
  },
  unclear: {
    label: "Unclear / Needs More Info",
    colorClass: "bg-zinc-500 text-white border-zinc-600",
  },
};

export const TAG_ORDER: TagType[] = [
  "logical_fallacy",
  "hidden_assumption",
  "weak_evidence",
  "bias",
  "framing_bias",
  "missing_actor",
  "assumed_causation",
  "analogy_misuse",
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
