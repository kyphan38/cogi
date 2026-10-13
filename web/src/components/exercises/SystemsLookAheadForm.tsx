"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SystemsLookAhead, SystemsUserEdge } from "@/lib/types/exercise";
import { findLoops, LOOP_KIND_INFO } from "@/lib/exercise/systems-loops";

/** Key loop, 5-year forecast and a better fix: the user thinks past the first shock. */
export function SystemsLookAheadForm({
  userEdges,
  label,
  value,
  onChange,
}: {
  userEdges: SystemsUserEdge[];
  label: (id: string) => string;
  value: SystemsLookAhead;
  onChange: (next: SystemsLookAhead) => void;
}) {
  const loops = findLoops(userEdges.map((e) => ({ from: e.source, to: e.target, type: e.type }))).slice(0, 4);
  const pickedKey = value.loop?.join(">") ?? null;
  return (
    <div className="space-y-4 border-t pt-3" data-testid="look-ahead">
      <p className="text-sm font-medium text-zinc-900">Look ahead</p>
      <div className="space-y-2">
        <p className="text-sm">Which loop drives this situation?</p>
        {loops.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Your map has no loop yet. You can go back and look for one, or answer below without it.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {loops.map((l) => {
              const key = l.nodes.join(">");
              return (
                <Button
                  key={key}
                  type="button"
                  variant={pickedKey === key ? "default" : "outline"}
                  aria-pressed={pickedKey === key}
                  className="h-auto justify-start whitespace-normal py-2 text-left"
                  onClick={() => onChange({ ...value, loop: pickedKey === key ? null : l.nodes })}
                >
                  {[...l.nodes, l.nodes[0]!].map(label).join(" -> ")}
                  {l.kind ? ` (${LOOP_KIND_INFO[l.kind].label.toLowerCase()})` : ""}
                </Button>
              );
            })}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="look-ahead-forecast">If nothing changes, what happens in 5 years?</Label>
        <Textarea
          id="look-ahead-forecast"
          rows={2}
          value={value.forecast}
          onChange={(e) => onChange({ ...value, forecast: e.target.value })}
          placeholder="Follow the loop: what keeps growing, or what settles?"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="look-ahead-fix">What is a better fix?</Label>
        <Textarea
          id="look-ahead-fix"
          rows={2}
          value={value.fix}
          onChange={(e) => onChange({ ...value, fix: e.target.value })}
          placeholder="A fix that breaks or weakens the loop, not only the symptom."
        />
      </div>
    </div>
  );
}
