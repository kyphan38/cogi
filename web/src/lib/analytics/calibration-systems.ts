import type {
  SystemsIntendedConnection,
  SystemsShockEvent,
  SystemsUserEdge,
} from "@/lib/types/exercise";
import type { SystemsNodeImpact } from "@/lib/types/exercise";

const EDGE_BUDGET = 20;
const SHOCK_BONUS_POINTS = 10;
const INDIRECT_JACCARD_MIN = 0.75;

function edgeKey(from: string, to: string, type: string): string {
  return `${from}|${to}|${type}`;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Phase 1.3b - Systems row: % of intendedConnections matched by user-drawn edges
 * with the same (from, to, type) triplet. User edge list is capped by EDGE_BUDGET
 * for matching purposes (only first EDGE_BUDGET user edges participate in hit tests).
 *
 * Shock +10 points (capped at 100): user's direct set equals AI direct set;
 * Jaccard(user indirect, AI indirect) >= INDIRECT_JACCARD_MIN.
 */
export function computeSystemsAccuracy(input: {
  intendedConnections: SystemsIntendedConnection[];
  userEdges: SystemsUserEdge[];
  shock: SystemsShockEvent;
  nodeImpact: Record<string, SystemsNodeImpact>;
}): number {
  const intended = input.intendedConnections;
  if (intended.length === 0) return 0;

  const userLimited = input.userEdges.slice(0, EDGE_BUDGET);
  const userKeys = new Set(
    userLimited.map((e) => edgeKey(e.source, e.target, e.type)),
  );

  let hits = 0;
  for (const ic of intended) {
    if (userKeys.has(edgeKey(ic.from, ic.to, ic.type))) {
      hits += 1;
    }
  }
  const base = Math.round((hits / intended.length) * 100);

  const aiDirect = new Set(input.shock.directlyAffected);
  const aiIndirect = new Set(input.shock.indirectlyAffected);
  const userDirect = new Set(
    Object.entries(input.nodeImpact)
      .filter(([, v]) => v === "direct")
      .map(([k]) => k),
  );
  const userIndirect = new Set(
    Object.entries(input.nodeImpact)
      .filter(([, v]) => v === "indirect")
      .map(([k]) => k),
  );

  const sameDirect =
    aiDirect.size === userDirect.size &&
    [...aiDirect].every((id) => userDirect.has(id));
  const indirectJac = jaccard(userIndirect, aiIndirect);
  const shockBonus =
    sameDirect && indirectJac >= INDIRECT_JACCARD_MIN ? SHOCK_BONUS_POINTS : 0;

  return Math.min(100, base + shockBonus);
}
