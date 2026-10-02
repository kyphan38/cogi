"use client";

import { PRACTICE_LEVELS, LEVEL_LABELS, type PracticeLevel } from "@/lib/exercise/levels";
import { cn } from "@/lib/utils";

/** Pick the practice level; each option says in one line what it changes. */
export function LevelPicker({
  value,
  onChange,
  descriptions,
  note,
}: {
  value: PracticeLevel;
  onChange: (level: PracticeLevel) => void;
  descriptions: Record<PracticeLevel, string>;
  /** Shown under the options, e.g. when a domain overrides the level. */
  note?: string;
}) {
  return (
    <fieldset className="grid gap-2" data-testid="level-picker">
      <legend className="mb-2 text-sm font-medium">Level</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {PRACTICE_LEVELS.map((level) => {
          const active = level === value;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(level)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                active ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50",
              )}
            >
              <span className="text-sm font-medium text-zinc-900">{LEVEL_LABELS[level]}</span>
              <span className="text-xs text-zinc-500">{descriptions[level]}</span>
            </button>
          );
        })}
      </div>
      {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
    </fieldset>
  );
}
