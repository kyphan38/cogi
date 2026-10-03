"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shuffledOrder } from "@/lib/exercise/guided-candidates";

export interface LearnConcept {
  term: string;
  plain: string;
  example: string;
}

export interface LearnCheck {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

/** The terms of an exercise as a compact list (also used to look them up mid-exercise). */
export function ConceptList({ concepts }: { concepts: LearnConcept[] }) {
  return (
    <ul className="space-y-3" data-testid="concept-list">
      {concepts.map((c) => (
        <li key={c.term} className="rounded-xl border border-zinc-200 p-3">
          <p className="font-medium text-zinc-900">{c.term}</p>
          <p className="text-sm text-zinc-700">{c.plain}</p>
          <p className="text-sm text-zinc-500">Example: {c.example}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Learn first" (PLAN-learning.md): read the few terms this exercise uses, answer a
 * quick check, then start. Answers are option indexes in the original order; the
 * options are shown in an order shuffled by `seed`.
 */
export function LearnFirst({
  concepts,
  checks,
  answers,
  onAnswer,
  onDone,
  seed,
}: {
  concepts: LearnConcept[];
  checks: LearnCheck[];
  answers: (number | undefined)[];
  onAnswer: (checkIndex: number, optionIndex: number) => void;
  onDone: () => void;
  seed: string;
}) {
  const orders = useMemo(
    () => checks.map((c, i) => shuffledOrder(c.options.length, `${seed}-check-${i}`)),
    [checks, seed],
  );
  const allAnswered = checks.every((_, i) => answers[i] != null);

  return (
    <div className="space-y-5" data-testid="learn-first">
      <div>
        <p className="font-medium text-zinc-900">First, a few ideas you will use in this exercise.</p>
        <p className="text-muted-foreground text-sm">Read them, then answer the quick check.</p>
      </div>
      <ConceptList concepts={concepts} />
      {checks.map((check, ci) => {
        const picked = answers[ci];
        return (
          <div key={ci} className="space-y-2" data-testid="concept-check">
            <p className="text-sm font-medium text-zinc-900">Quick check: {check.question}</p>
            <div className="grid gap-2" role="radiogroup" aria-label={check.question}>
              {orders[ci]!.map((oi) => {
                const isPicked = picked === oi;
                const isAnswer = picked != null && oi === check.answerIndex;
                return (
                  <button
                    key={oi}
                    type="button"
                    role="radio"
                    aria-checked={isPicked}
                    disabled={picked != null}
                    onClick={() => onAnswer(ci, oi)}
                    className={cn(
                      "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm disabled:cursor-default",
                      isAnswer ? "border-zinc-900 bg-zinc-50" : isPicked ? "border-zinc-400" : "border-zinc-200 hover:bg-zinc-50",
                    )}
                  >
                    {isAnswer ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                    {isPicked && !isAnswer ? <X className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                    <span>{check.options[oi]}</span>
                  </button>
                );
              })}
            </div>
            {picked != null ? (
              <p className="text-sm" data-testid="concept-check-feedback">
                <span className="font-medium">{picked === check.answerIndex ? "Right. " : "Not quite. "}</span>
                {check.explanation}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button type="button" disabled={!allAnswered} onClick={onDone}>
        Start the exercise
      </Button>
    </div>
  );
}
