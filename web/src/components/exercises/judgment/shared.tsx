"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlowStep = 0 | 1 | 4 | 7;
/** Internal step that shows AI feedback (the 3rd practice phase); 7 is "saved". */
export const FEEDBACK_STEP = 4;

export const PART_LABELS = {
  learn: "Part 1 of 3 · Learn first",
  lenses: "Part 2 of 3 · Three lenses",
  respond: "Part 3 of 3 · Choose a response",
} as const;

export function ChoiceButtons({
  options,
  order,
  picked,
  answer,
  reveal,
  onPick,
  label,
}: {
  options: string[];
  order: number[];
  picked: number | undefined;
  answer: number;
  /** Show right / not right once picked (Guided). */
  reveal: boolean;
  onPick: (i: number) => void;
  label: string;
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label={label}>
      {order.map((oi) => {
        const isPicked = picked === oi;
        const showAnswer = reveal && picked != null && oi === answer;
        return (
          <button
            key={oi}
            type="button"
            role="radio"
            aria-checked={isPicked}
            disabled={reveal && picked != null}
            onClick={() => onPick(oi)}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-body disabled:cursor-default",
              showAnswer || (!reveal && isPicked)
                ? "border-foreground bg-muted"
                : isPicked
                  ? "border-foreground/40"
                  : "border-border hover:bg-muted",
            )}
          >
            {showAnswer ? (
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : null}
            {reveal && isPicked && oi !== answer ? (
              <X className="mt-0.5 size-4 shrink-0" aria-hidden />
            ) : null}
            <span>{options[oi]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Life situations through three lenses (PLAN-learning.md L1). */
