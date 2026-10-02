import type { SystemsUserEdge, SystemsNodeImpact } from "@/lib/types/exercise";

type ConnectionType = SystemsUserEdge["type"];

/** Plain names and meanings of the four connection types (arrow goes A -> B). */
export const CONNECTION_TYPE_INFO: Record<ConnectionType, { label: string; meaning: string }> = {
  depends_on: { label: "depends on", meaning: "A needs B to work." },
  enables: { label: "enables", meaning: "A makes B possible or easier." },
  conflicts_with: { label: "conflicts with", meaning: "A and B pull against each other." },
  risks: { label: "risks", meaning: "A puts B in danger." },
};

export const IMPACT_LABELS: Record<SystemsNodeImpact, string> = {
  none: "not affected",
  direct: "directly affected",
  indirect: "indirectly affected",
};
