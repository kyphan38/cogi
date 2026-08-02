import type { PracticedTopicArea } from "@/lib/types/practiced-topic";

/** Last-fetched batch of AI topic suggestions for one (kind, area), cached per user. */
export interface CachedTopicList {
  /** Deterministic: `${kind}:${area}`. */
  id: string;
  area: PracticedTopicArea;
  kind: "exercise" | "math";
  /** Last-shown batch (≤5), replaced on every fetch/regenerate. */
  suggestions: { title: string; blurb: string }[];
  /** Accumulated across all batches shown this cycle - keeps AI exclusion continuity after a cache hit. */
  shownTitles: string[];
  moreClicksUsed: number;
  updatedAt: string;
}
