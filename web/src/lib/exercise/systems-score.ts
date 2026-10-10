import type {
  SystemsIntendedConnection,
  SystemsNodeImpact,
  SystemsNodeSpec,
  SystemsShockEvent,
  SystemsUserEdge,
} from "@/lib/types/exercise";
import type { ResultRating } from "@/lib/exercise/levels";

/** How one of the model's connections was handled. */
export interface SystemsConnectionOutcome {
  /** Index into `intendedConnections`. */
  index: number;
  /** The user's edge on the same pair of nodes, if any. */
  edgeId: string | null;
  /** "same": same direction (or the same meaning, see sameLink); "reversed": the user drew it the other way. */
  direction: "same" | "reversed" | null;
  userType: SystemsUserEdge["type"] | null;
  found: boolean;
  /** Found with the same meaning: same direction and type, or an equivalent (see sameLink). */
  exact: boolean;
}

export interface SystemsImpactOutcome {
  nodeId: string;
  expected: SystemsNodeImpact;
  user: SystemsNodeImpact;
  correct: boolean;
}

/** How the user traced the shock to an indirectly affected node (PLAN-learning.md L4). */
export interface SystemsSpreadOutcome {
  nodeId: string;
  /** The node the user says the shock comes through. */
  via: string;
  /** Affected nodes the model links to this node: the right answers. */
  possibleVia: string[];
  correct: boolean;
}

/** Systems work scored against the model, in code (plan phase 6a). */
export interface SystemsResult {
  connections: SystemsConnectionOutcome[];
  /** User edges between nodes the model does not connect. */
  extraEdgeIds: string[];
  impacts: SystemsImpactOutcome[];
  connectionsFound: number;
  connectionsExact: number;
  connectionsTotal: number;
  /** Nodes the model or the user marks as affected, marked the same as the model. */
  impactsCorrect: number;
  /** Nodes the model or the user marks as affected. "Not affected" on both sides is not counted. */
  impactsTotal: number;
  /** One row per indirect node the user traced; absent on older results. */
  spread?: SystemsSpreadOutcome[];
}

export function expectedImpact(shock: SystemsShockEvent, nodeId: string): SystemsNodeImpact {
  if (shock.directlyAffected.includes(nodeId as never)) return "direct";
  if (shock.indirectlyAffected.includes(nodeId as never)) return "indirect";
  return "none";
}

type LinkType = SystemsUserEdge["type"];

/**
 * One key per meaning: "A depends on B" is "B enables A", and "conflicts with" has no
 * direction. Only "risks" keeps its arrow as drawn.
 */
function linkMeaning(from: string, to: string, type: LinkType): string {
  if (type === "depends_on") return `enables:${to}>${from}`;
  if (type === "conflicts_with") return `conflicts:${[from, to].sort().join("|")}`;
  return `${type}:${from}>${to}`;
}

/** The user's link says the same thing as the model's, even if drawn another way. */
export function sameLink(a: { from: string; to: string; type: LinkType }, b: { from: string; to: string; type: LinkType }): boolean {
  return linkMeaning(a.from, a.to, a.type) === linkMeaning(b.from, b.to, b.type);
}

export function scoreSystems(input: {
  nodes: SystemsNodeSpec[];
  intendedConnections: SystemsIntendedConnection[];
  shockEvent: SystemsShockEvent;
  userEdges: SystemsUserEdge[];
  nodeImpact: Record<string, SystemsNodeImpact>;
  /** Indirect node id -> the node the user says the shock comes through. */
  impactVia?: Record<string, string>;
}): SystemsResult {
  const used = new Set<string>();
  const connections = input.intendedConnections.map((c, index) => {
    const free = input.userEdges.filter((e) => !used.has(e.id));
    const exact = free.find((e) => sameLink({ from: e.source, to: e.target, type: e.type }, c));
    const same = exact ?? free.find((e) => e.source === c.from && e.target === c.to);
    const reversed = same ? undefined : free.find((e) => e.source === c.to && e.target === c.from);
    const edge = same ?? reversed ?? null;
    if (edge) used.add(edge.id);
    return {
      index,
      edgeId: edge?.id ?? null,
      direction: same ? ("same" as const) : reversed ? ("reversed" as const) : null,
      userType: edge?.type ?? null,
      found: edge != null,
      exact: exact != null,
    };
  });
  const impacts = input.nodes.map((n) => {
    const expected = expectedImpact(input.shockEvent, n.id);
    const user = input.nodeImpact[n.id] ?? "none";
    return { nodeId: n.id, expected, user, correct: expected === user };
  });
  // Most nodes are untouched by a shock; counting "none = none" would score a blank map well.
  const relevant = impacts.filter((i) => i.expected !== "none" || i.user !== "none");
  const linked = (x: string, y: string) =>
    input.intendedConnections.some((c) => (c.from === x && c.to === y) || (c.from === y && c.to === x));
  const spread = Object.entries(input.impactVia ?? {})
    .filter(([nodeId, via]) => via && (input.nodeImpact[nodeId] ?? "none") === "indirect")
    .map(([nodeId, via]) => {
      const possibleVia = input.nodes
        .map((n): string => n.id)
        .filter((id) => id !== nodeId && expectedImpact(input.shockEvent, id) !== "none" && linked(id, nodeId));
      return { nodeId, via, possibleVia, correct: possibleVia.includes(via) };
    });
  return {
    connections,
    spread,
    extraEdgeIds: input.userEdges.filter((e) => !used.has(e.id)).map((e) => e.id),
    impacts,
    connectionsFound: connections.filter((c) => c.found).length,
    connectionsExact: connections.filter((c) => c.exact).length,
    connectionsTotal: connections.length,
    impactsCorrect: relevant.filter((i) => i.correct).length,
    impactsTotal: relevant.length,
  };
}

/** Good: on average at least 75% of connections found and affected nodes marked right. Poor: 35% or less. */
export function rateSystems(r: SystemsResult): ResultRating {
  const conn = r.connectionsTotal > 0 ? r.connectionsFound / r.connectionsTotal : 1;
  const impact = r.impactsTotal > 0 ? r.impactsCorrect / r.impactsTotal : 1;
  const share = (conn + impact) / 2;
  if (share >= 0.75) return "good";
  if (share <= 0.35) return "poor";
  return "ok";
}

/**
 * Refs for the coaching feedback: `node_<id>`, `conn_<n>` (1-based, model order),
 * `extra_<n>` (1-based, order of `extraEdgeIds`). Required: wrongly marked nodes, up to
 * 4 missed or reversed connections, up to 2 extra edges.
 */
export function systemsCoachingRefs(r: SystemsResult): { required: string[]; allowed: string[] } {
  const nodeRefs = r.impacts.map((i) => `node_${i.nodeId}`);
  const connRefs = r.connections.map((c) => `conn_${c.index + 1}`);
  const extraRefs = r.extraEdgeIds.map((_, i) => `extra_${i + 1}`);
  return {
    required: [
      ...r.impacts.filter((i) => !i.correct).map((i) => `node_${i.nodeId}`),
      ...r.connections
        .filter((c) => !c.found || c.direction === "reversed")
        .slice(0, 4)
        .map((c) => `conn_${c.index + 1}`),
      ...extraRefs.slice(0, 2),
      ...(r.spread ?? []).filter((s) => !s.correct).map((s) => `via_${s.nodeId}`),
    ],
    allowed: [...nodeRefs, ...connRefs, ...extraRefs, ...(r.spread ?? []).map((s) => `via_${s.nodeId}`)],
  };
}

/** The stored result, or a fresh score for rows saved before results were stored. */
export function systemsResultOf(row: {
  nodes: SystemsNodeSpec[];
  intendedConnections: SystemsIntendedConnection[];
  shockEvent: SystemsShockEvent;
  userEdges: SystemsUserEdge[];
  nodeImpact: Record<string, SystemsNodeImpact>;
  impactVia?: Record<string, string>;
  result?: SystemsResult | null;
}): SystemsResult {
  return row.result ?? scoreSystems(row);
}
