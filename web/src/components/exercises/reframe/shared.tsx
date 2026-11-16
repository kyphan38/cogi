"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { type ReframeExerciseRow } from "@/lib/types/exercise";
import type { ReframeAnswer } from "@/lib/ai/validators/reframe";
import {
  REALISTIC_INFO,
  REFRAME_LEVELS,
  REFRAME_TAG_INFO,
  type ReframeLevelConfig,
} from "@/lib/exercise/reframe-levels";

export type FlowStep = 0 | 1 | 4 | 7;
/** Internal step that shows AI feedback (the 3rd practice phase); 7 is "saved". */
export const FEEDBACK_STEP = 4;

export const PART_LABELS = {
  learn: "Part 1 of 3 · Learn first",
  spot: "Part 2 of 3 · Spot the traps",
  reframe: "Part 3 of 3 · Reframe",
} as const;

/** Answers the user can give at a level: its traps, then "Realistic". */
export function answerOptions(cfg: ReframeLevelConfig): ReframeAnswer[] {
  return [...cfg.tags, "realistic"];
}

/**
 * The monologue level leaves fair thoughts untouched (like Analytical Expert), so an
 * unmarked thought counts as "realistic" there.
 */
export function answersForScoring(
  ex: ReframeExerciseRow,
): Partial<Record<string, ReframeAnswer>> {
  const answers = { ...(ex.answers ?? {}) };
  if (REFRAME_LEVELS[ex.level].layout === "monologue") {
    for (const t of ex.thoughts) answers[t.id] ??= "realistic";
  }
  return answers;
}

export function TrapPicker({
  options,
  picked,
  onPick,
  disabled,
  label,
  showQuestions,
}: {
  options: ReframeAnswer[];
  picked: ReframeAnswer | undefined;
  onPick: (a: ReframeAnswer) => void;
  disabled?: boolean;
  label: string;
  showQuestions: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        showQuestions ? "sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
      )}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((a) => {
        const info = a === "realistic" ? REALISTIC_INFO : REFRAME_TAG_INFO[a];
        const isPicked = picked === a;
        return (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={isPicked}
            disabled={disabled}
            onClick={() => onPick(a)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left text-body disabled:cursor-default",
              isPicked
                ? "border-foreground bg-muted font-medium"
                : "border-border hover:bg-muted",
              a === "realistic" && !isPicked ? "border-dashed" : null,
            )}
          >
            <span className="block">{info.name}</span>
            {showQuestions ? (
              <span className="text-muted-foreground block text-meta font-normal">
                {info.question}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TrapGuide({ options }: { options: ReframeAnswer[] }) {
  return (
    <details
      className="border-t border-border pt-2 text-body"
      data-testid="trap-guide"
    >
      <summary className="cursor-pointer font-medium">
        Trap guide: the question behind each name
      </summary>
      <ul className="mt-2 space-y-1">
        {options.map((a) => {
          const info = a === "realistic" ? REALISTIC_INFO : REFRAME_TAG_INFO[a];
          return (
            <li key={a}>
              <span className="font-medium">{info.name}: </span>
              <span className="text-muted-foreground">{info.question}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function FeelingSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid max-w-md gap-3">
      <Label htmlFor={id}>
        {label} ({value}/100)
      </Label>
      <Slider
        id={id}
        thumbLabel={label}
        min={0}
        max={100}
        step={5}
        value={[value]}
        onValueChange={(v) => {
          const n = Array.isArray(v) ? v[0] : v;
          onChange(typeof n === "number" ? n : 0);
        }}
      />
    </div>
  );
}

/** Reframe: spot thinking traps, then rewrite one thought (PLAN-psychology.md P1). */
