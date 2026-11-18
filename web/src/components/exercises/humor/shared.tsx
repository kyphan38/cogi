"use client";

import { HUMOR_STEP_INFO, HUMOR_STEPS } from "@/lib/exercise/humor-levels";

export type FlowStep = 0 | 1 | 4 | 7;
/** Internal step that shows the feedback (the 3rd practice phase); 7 is "saved". */
export const FEEDBACK_STEP = 4;

export const PART_LABELS = {
  learn: "Part 1 of 2 · Learn first",
  rounds: "Part 2 of 2 · Reply",
} as const;

/** The four checks of a good light reply, as a short checklist. */
export function StepsGuide() {
  return (
    <ol className="space-y-1 rounded-xl border border-border px-4 py-3 text-body" data-testid="humor-steps">
      {HUMOR_STEPS.map((s, i) => (
        <li key={s}>
          <span className="font-medium text-foreground">
            {i + 1}. {HUMOR_STEP_INFO[s].name}
          </span>
          <span className="text-muted-foreground"> - {HUMOR_STEP_INFO[s].question}</span>
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
