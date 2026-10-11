import type { SystemsUserEdge, SystemsNodeImpact } from "@/lib/types/exercise";

type ConnectionType = SystemsUserEdge["type"];

/** Plain names and meanings of the link types (arrow goes A -> B). */
export const CONNECTION_TYPE_INFO: Record<ConnectionType, { label: string; meaning: string; short: string }> = {
  increases: { label: "increases", meaning: "When A goes up, B goes up.", short: "+" },
  decreases: { label: "decreases", meaning: "When A goes up, B goes down.", short: "−" },
  // Exercises saved before signed links.
  depends_on: { label: "depends on", meaning: "A needs B to work.", short: "depends on" },
  enables: { label: "enables", meaning: "A makes B possible or easier.", short: "enables" },
  conflicts_with: { label: "conflicts with", meaning: "A and B pull against each other.", short: "conflicts with" },
  risks: { label: "risks", meaning: "A puts B in danger.", short: "risks" },
};

const SIGNED: ConnectionType[] = ["increases", "decreases"];
const LEGACY: ConnectionType[] = ["depends_on", "conflicts_with", "enables", "risks"];

/** The link types an exercise uses: signed, or the old four for exercises saved before them. */
export function linkTypesFor(connections: { type: ConnectionType }[]): ConnectionType[] {
  return connections.some((c) => LEGACY.includes(c.type)) ? LEGACY : SIGNED;
}

export const IMPACT_LABELS: Record<SystemsNodeImpact, string> = {
  none: "not affected",
  direct: "directly affected",
  indirect: "indirectly affected",
};
