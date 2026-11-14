"use client";

import type { SystemsUserEdge } from "@/lib/types/exercise";
import { findLoops, LOOP_KIND_INFO } from "@/lib/exercise/systems-loops";

/** The loops in a set of links, so the user sees a feedback loop as soon as they close one. */
export function SystemsLoopList({
  links,
  label,
  title = "Loops in your map",
}: {
  links: { from: string; to: string; type: SystemsUserEdge["type"] }[];
  label: (id: string) => string;
  title?: string;
}) {
  const loops = findLoops(links).slice(0, 3);
  if (loops.length === 0) return null;
  return (
    <div className="space-y-2 border-t pt-3 text-sm" data-testid="loop-list">
      <p className="font-medium text-foreground">{title}</p>
      <ul className="space-y-2">
        {loops.map((l) => (
          <li key={l.nodes.join(">")}>
            {l.kind ? (
              <p>
                <span className="font-medium">{LOOP_KIND_INFO[l.kind].label}</span>
                <span className="text-faint"> - {LOOP_KIND_INFO[l.kind].meaning}</span>
              </p>
            ) : null}
            <p className="text-muted-foreground">{[...l.nodes, l.nodes[0]!].map(label).join(" -> ")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
