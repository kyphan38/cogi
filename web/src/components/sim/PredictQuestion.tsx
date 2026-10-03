"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Guess first, then see: the user picks an answer before the simulator shows the
 * numbers (`onReveal` moves the sliders to the question's case).
 */
export function PredictQuestion({
  question,
  options,
  answerIndex,
  explanation,
  onReveal,
}: {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  onReveal: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 p-3" data-testid="predict-question">
      <p className="text-sm font-medium text-zinc-900">Guess first: {question}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={question}>
        {options.map((o, i) => {
          const isPicked = picked === i;
          const isAnswer = picked != null && i === answerIndex;
          return (
            <Button
              key={o}
              type="button"
              size="sm"
              role="radio"
              aria-checked={isPicked}
              variant={isAnswer ? "default" : "outline"}
              disabled={picked != null}
              className={cn("gap-1.5 disabled:opacity-100", isPicked && !isAnswer && "border-zinc-900")}
              onClick={() => {
                setPicked(i);
                onReveal();
              }}
            >
              {isAnswer ? <Check className="size-3.5" aria-hidden /> : null}
              {isPicked && !isAnswer ? <X className="size-3.5" aria-hidden /> : null}
              {o}
            </Button>
          );
        })}
      </div>
      {picked != null ? (
        <p className="text-sm" data-testid="predict-feedback">
          <span className="font-medium">{picked === answerIndex ? "Right. " : "Not quite. "}</span>
          {explanation} The sliders now show this case.
        </p>
      ) : null}
    </div>
  );
}
