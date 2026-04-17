import type { ThinkingType } from "@/lib/types/exercise";

export type WeaknessStatus = "active" | "resolved";

/** Thinking mode this weakness belongs to (combo exercises update subs, not `combo`). */
export type WeaknessThinkingGroup = Exclude<ThinkingType, "combo">;

/**
 * Phase 7.2 — queued blind spot (Dexie `weaknesses`).
 * `type` is an embedded-issue tag for analytical, or a coarse bucket id for other modes.
 */
export interface WeaknessEntry {
  id: string;
  thinkingGroup: WeaknessThinkingGroup;
  type: string;
  missCount: number;
  hitCount: number;
  status: WeaknessStatus;
  /** ISO timestamp */
  lastSeen: string;
}

/** Coarse weakness buckets (7.2 extension beyond per-issue analytical). */
export const WEAKNESS_BUCKET = {
  sequential: "sequential_dependency_order",
  systems: "systems_edges_shock",
  evaluativeMatrix: "evaluative_matrix_placement",
  evaluativeScoring: "evaluative_scoring_tradeoffs",
  generative: "generative_rubric_depth",
} as const;
