"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Section } from "@/components/shared/Section";
import { startRedo } from "@/lib/db/redo";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { redoSuggestion } from "@/lib/exercise/redo";
import { formatDay } from "@/lib/history";
import { localDay } from "@/lib/review/schedule";
import { isSideExercise, type Exercise } from "@/lib/types/exercise";

/** Today: one exercise finished 30 or more days ago, offered again. */
export function RedoRow({ completed, incomplete }: { completed: Exercise[]; incomplete: Exercise[] }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const ex = redoSuggestion(completed, [...completed, ...incomplete], localDay(new Date()));
  if (!ex || isSideExercise(ex)) return null;

  const go = async () => {
    if (starting) return;
    setStarting(true);
    try {
      router.push(await startRedo(ex));
    } catch {
      setStarting(false);
    }
  };

  return (
    <Section title="Do it again" data-testid="redo-row">
      <button
        type="button"
        onClick={() => void go()}
        disabled={starting}
        className="group/row flex w-full min-w-0 items-center justify-between gap-4 border-y border-border py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-body">{ex.title}</span>
          <span className="block truncate text-meta text-muted-foreground">
            {TYPE_LABEL[ex.type] ?? ex.type} · finished {formatDay(ex.completedAt!)}
          </span>
        </span>
        <span className="shrink-0 text-body text-muted-foreground transition-colors after:ml-1 after:content-['›'] group-hover/row:text-foreground">
          {starting ? "opening" : "redo"}
        </span>
      </button>
    </Section>
  );
}
