import type { TagType } from "@/lib/types/exercise";

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
  "valid_point",
  "unclear",
];
