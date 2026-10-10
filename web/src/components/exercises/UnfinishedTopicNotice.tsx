"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteExercise, listIncompleteExercises } from "@/lib/db/exercises";
import type { Exercise } from "@/lib/types/exercise";
import { cn } from "@/lib/utils";

const sameTopic = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Opening a topic that already has an unfinished exercise of this type: offer to
 * continue it, or to start over (the old one is discarded, so the Continue list does
 * not fill up with copies).
 */
export function UnfinishedTopicNotice({ type, domain }: { type: string; domain: string }) {
  const [row, setRow] = useState<Exercise | null>(null);
  // Set once a new exercise starts here (see rememberExerciseInUrl): the choice is made.
  const started = useSearchParams().has("resumeId");

  useEffect(() => {
    let cancelled = false;
    listIncompleteExercises()
      .then((rows) => {
        if (!cancelled) setRow(rows.find((r) => r.type === type && sameTopic(r.domain, domain)) ?? null);
      })
      .catch(() => {
        // Only a convenience: the setup still works.
      });
    return () => {
      cancelled = true;
    };
  }, [type, domain]);

  if (!row || started) return null;

  const startOver = async () => {
    if (!window.confirm("Discard the unfinished exercise and start over? This cannot be undone.")) return;
    setRow(null);
    await deleteExercise(row.id).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
        data-testid="unfinished-topic"
      >
        <p className="min-w-0">You started this topic before.</p>
        <div className="flex gap-2">
          {/* A full load: the flow reads its params once, at mount, and this is the same route. */}
          <a
            href={`/exercise/${row.type}?resumeId=${encodeURIComponent(row.id)}`}
            className={cn(buttonVariants({ size: "sm" }))}
            data-testid="unfinished-continue"
          >
            Continue
          </a>
          <Button type="button" size="sm" variant="outline" onClick={() => void startOver()} data-testid="unfinished-start-over">
            Start over
          </Button>
        </div>
      </div>
    </div>
  );
}
