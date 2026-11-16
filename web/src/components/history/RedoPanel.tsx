"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { WORD_LINK } from "@/components/shared/Section";
import { HistoryDetailBody } from "@/components/history/HistoryDetailBody";
import { startRedo } from "@/lib/db/redo";
import { canRedo } from "@/lib/exercise/redo";
import { compareTries, scoreSummary } from "@/lib/exercise/score-summary";
import { formatDay } from "@/lib/history";
import { localDay } from "@/lib/review/schedule";
import { isSideExercise, type Exercise } from "@/lib/types/exercise";

const VERDICT = { better: "Better than the first try.", same: "Same as the first try.", lower: "Lower than the first try." } as const;

function Try({ label, ex }: { label: string; ex: Exercise }) {
  return (
    <div className="min-w-0">
      <p className="section-label">{label}</p>
      <p className="mt-1 text-body">{scoreSummary(ex)?.line ?? "No score"}</p>
      <p className="text-meta text-muted-foreground">{formatDay(ex.completedAt!)}</p>
    </div>
  );
}

/**
 * History review: for an exercise done twice, the two tries next to each other, with
 * the other try's full answers one word away. For an old exercise, the way to redo it.
 */
export function RedoPanel({ ex, completed }: { ex: Exercise; completed: Exercise[] }) {
  const router = useRouter();
  const [showOther, setShowOther] = useState(false);
  const [starting, setStarting] = useState(false);
  if (isSideExercise(ex)) return null;

  const first = ex.redoOf ? completed.find((r) => r.id === ex.redoOf) : ex;
  const redo = ex.redoOf ? ex : completed.find((r) => "redoOf" in r && r.redoOf === ex.id);

  if (first && redo) {
    const other = ex.id === first.id ? redo : first;
    const otherName = other.id === first.id ? "first try" : "redo";
    const verdict = compareTries(first, redo);
    return (
      <div data-testid="redo-compare">
        <div className="grid grid-cols-2 gap-4 border-y border-border py-3">
          <Try label="First try" ex={first} />
          <Try label="Redo" ex={redo} />
        </div>
        <p className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-meta text-muted-foreground">
          <span>{verdict ? VERDICT[verdict] : null}</span>
          <button type="button" className={WORD_LINK} aria-expanded={showOther} onClick={() => setShowOther((o) => !o)}>
            {showOther ? `hide the ${otherName}` : `show the ${otherName}`}
          </button>
        </p>
        {showOther ? (
          <div className="fade-in mt-4 space-y-6 border-l-2 border-border pl-4" data-testid="redo-other-try">
            <HistoryDetailBody detailEx={other} />
          </div>
        ) : null}
      </div>
    );
  }

  if (!canRedo(ex, completed, localDay(new Date()))) return null;
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
    <p className="flex flex-wrap items-baseline justify-between gap-2 border-y border-border py-3 text-body" data-testid="redo-offer">
      <span className="text-muted-foreground">Finished over 30 days ago.</span>
      <button type="button" className="font-medium text-foreground after:ml-1 after:content-['›']" onClick={() => void go()} disabled={starting}>
        {starting ? "opening" : "redo"}
      </button>
    </p>
  );
}
