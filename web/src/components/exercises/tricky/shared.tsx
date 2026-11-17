"use client";

import { TRICKY_STEP_INFO, TRICKY_STEPS } from "@/lib/exercise/tricky-levels";

export type FlowStep = 0 | 1 | 4 | 7;
/** Internal step that shows the feedback (the 3rd practice phase); 7 is "saved". */
export const FEEDBACK_STEP = 4;

export const PART_LABELS = {
  learn: "Part 1 of 2 · Learn first",
  rounds: "Part 2 of 2 · Answer",
} as const;

/** The four steps of a wise answer, as a short checklist. */
export function StepsGuide() {
  return (
    <ol className="space-y-1 rounded-xl border border-border px-4 py-3 text-body" data-testid="tricky-steps">
      {TRICKY_STEPS.map((s, i) => (
        <li key={s}>
          <span className="font-medium text-foreground">
            {i + 1}. {TRICKY_STEP_INFO[s].name}
          </span>
          <span className="text-muted-foreground"> - {TRICKY_STEP_INFO[s].question}</span>
        </li>
      ))}
    </ol>
  );
}

/** One line of the conversation: who speaks, then what they say. */
export function Line({ who, text, mine = false }: { who: string; text: string; mine?: boolean }) {
  return (
    <div className={mine ? "border-l-2 border-foreground/40 pl-4" : "border-l-2 border-border pl-4"}>
      <p className="text-meta text-muted-foreground">{who}</p>
      <p className="whitespace-pre-wrap text-body text-foreground">{text}</p>
    </div>
  );
}
