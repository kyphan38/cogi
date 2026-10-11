import type { SystemsUserEdge } from "@/lib/types/exercise";

type Link = { from: string; to: string; type: SystemsUserEdge["type"] };

export interface SystemsLoop {
  /** Node ids in order; the last one links back to the first. */
  nodes: string[];
  /** Reinforcing: an even number of "decreases" links, so a change grows. Balancing: odd, so
   * a change pushes back. Null when a link has no sign (exercises saved before signed links). */
  kind: "reinforcing" | "balancing" | null;
}

/** Every simple loop in the links, each once, shortest first. Graphs here have 6 nodes. */
export function findLoops(links: Link[]): SystemsLoop[] {
  const out = new Map<string, SystemsLoop>();
  const walk = (start: string, at: string, path: string[], used: Link[]) => {
    for (const l of links) {
      if (l.from !== at) continue;
      if (l.to === start) {
        const key = canonical(path);
        if (!out.has(key)) out.set(key, { nodes: path, kind: kindOf([...used, l]) });
      } else if (!path.includes(l.to)) {
        walk(start, l.to, [...path, l.to], [...used, l]);
      }
    }
  };
  for (const id of new Set(links.map((l) => l.from))) walk(id, id, [id], []);
  return [...out.values()].sort((a, b) => a.nodes.length - b.nodes.length);
}

function kindOf(links: Link[]): SystemsLoop["kind"] {
  if (links.some((l) => l.type !== "increases" && l.type !== "decreases")) return null;
  return links.filter((l) => l.type === "decreases").length % 2 === 0 ? "reinforcing" : "balancing";
}

/** Same loop from any start node gives the same key. */
function canonical(path: string[]): string {
  const i = path.indexOf([...path].sort()[0]!);
  return [...path.slice(i), ...path.slice(0, i)].join(">");
}

export const LOOP_KIND_INFO: Record<NonNullable<SystemsLoop["kind"]>, { label: string; meaning: string }> = {
  reinforcing: { label: "Reinforcing loop", meaning: "A change feeds itself and keeps growing." },
  balancing: { label: "Balancing loop", meaning: "A change pushes back on itself and settles." },
};
