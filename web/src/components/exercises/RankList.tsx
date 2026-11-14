"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Order items best first with up/down buttons (works the same with touch and keys). */
export function RankList({
  items,
  order,
  onChange,
}: {
  items: { id: string; text: string }[];
  order: string[];
  onChange: (next: string[]) => void;
}) {
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <ol className="space-y-2" data-testid="rank-list">
      {order.map((id, i) => {
        const item = items.find((x) => x.id === id);
        if (!item) return null;
        return (
          <li key={id} className="flex items-start gap-2 rounded-xl border border-border p-3" data-testid="rank-item">
            <span className="mt-0.5 w-5 shrink-0 text-body font-semibold tabular-nums text-foreground">{i + 1}</span>
            <p className="min-w-0 flex-1 text-body text-foreground">{item.text}</p>
            <div className="flex shrink-0 flex-col gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move up: ${item.text}`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ChevronUp className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move down: ${item.text}`}
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
              >
                <ChevronDown className="size-4" aria-hidden />
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
