import type { SystemsIntendedConnection, SystemsNodeCriticalityHint } from "@/lib/types/exercise";
import type { SystemsResult } from "@/lib/exercise/systems-score";
import type { SystemsIdea } from "@/lib/exercise/systems-idea-guide";
import { firstKeys } from "@/lib/exercise/take-with-you";

type Link = { from: string; to: string; type: SystemsIntendedConnection["type"] };

/** The link is part of a loop: from its end you can get back to its start. */
function inLoop(c: Link, all: Link[]): boolean {
  const seen = new Set<string>([c.to]);
  const queue = [c.to];
  while (queue.length) {
    const at = queue.shift()!;
    if (at === c.from) return true;
    for (const e of all) {
      if (e.from === at && !seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return false;
}

const IDEA_OF_TYPE: Record<SystemsIntendedConnection["type"], SystemsIdea> = {
  depends_on: "hidden_dependencies",
  enables: "hidden_dependencies",
  conflicts_with: "trade_offs",
  risks: "risks",
};

/**
 * Which systems ideas get a "Take with you" card, decided in code so the server prompt
 * and the answer key agree: a missed single point of failure (resilience), then ripple
 * effects if the shock was traced differently, then the ideas behind missed links (a
 * link in a loop first), then defaults.
 */
export function pickSystemsCards(input: {
  intendedConnections: Link[];
  result: Pick<SystemsResult, "connections" | "impacts" | "spread">;
  /** Resilience: the model's most critical node, and the rank the user gave it. */
  criticality?: { topNodeId: string; userRank: number | undefined } | null;
}): SystemsIdea[] {
  const { intendedConnections: links, result } = input;
  const spofMissed = input.criticality != null && input.criticality.userRank !== 1;
  const rippleMissed =
    result.impacts.some((i) => !i.correct && (i.expected === "indirect" || i.user === "indirect")) ||
    (result.spread ?? []).some((s) => !s.correct);
  const missed = result.connections.filter((c) => !c.exact).map((c) => links[c.index]!).filter(Boolean);
  return firstKeys([
    spofMissed ? "single_points_of_failure" : null,
    rippleMissed ? "ripple_effects" : null,
    ...missed.filter((c) => inLoop(c, links)).map(() => "feedback_loops"),
    ...missed.map((c) => IDEA_OF_TYPE[c.type]),
    input.criticality ? "single_points_of_failure" : null,
    "ripple_effects",
    links.some((c) => inLoop(c, links)) ? "feedback_loops" : null,
    ...links.map((c) => IDEA_OF_TYPE[c.type]),
  ]) as SystemsIdea[];
}

/** Resilience only: the model's most critical node and the rank the user gave it. */
export function systemsCriticality(
  groundTruth: Pick<SystemsNodeCriticalityHint, "nodeId" | "criticalityRank">[] | undefined,
  userRanking: Record<string, number> | undefined,
): { topNodeId: string; userRank: number | undefined } | null {
  const top = groundTruth?.find((h) => h.criticalityRank === 1);
  if (!top || !userRanking) return null;
  return { topNodeId: top.nodeId, userRank: userRanking[top.nodeId] };
}
