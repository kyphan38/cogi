"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  deleteCompletedExerciseAndRelatedRecords,
  listCompletedExercises,
  listIncompleteExercises,
} from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { computeStreak } from "@/lib/exercise/streak";
import { cn } from "@/lib/utils";

/** How many in-progress and recently finished exercises the start page lists. */
const HOME_LIST_SIZE = 5;

function resumeHref(ex: Exercise): string {
  if (ex.type === "combo") return `/exercise/combo?resumeId=${ex.id}`;
  return `/exercise/${ex.type}?resumeId=${ex.id}`;
}

function ExerciseRowLabel({ ex }: { ex: Exercise }) {
  return (
    <div className="min-w-0">
      <span className="text-muted-foreground mr-2 text-xs font-medium uppercase">
        {TYPE_LABEL[ex.type] ?? ex.type}
      </span>
      <span className="font-medium truncate">{ex.title}</span>
      {ex.domain ? <span className="text-muted-foreground ml-2 text-xs">· {ex.domain}</span> : null}
    </div>
  );
}

const rowLinkClass =
  "flex min-w-0 flex-1 items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm hover:bg-muted/40 transition-colors";

/** Start page: one way to begin, then pick up unfinished work or look back at recent ones. */
export function HomeContent() {
  const [incompleteExercises, setIncompleteExercises] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<Exercise[]>([]);
  const [stats, setStats] = useState<{ completed: number; streak: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [incomplete, completed] = await Promise.all([
          listIncompleteExercises(),
          listCompletedExercises(),
        ]);
        if (cancelled) return;
        setIncompleteExercises(incomplete.slice(0, HOME_LIST_SIZE));
        setCompletedExercises(completed.slice(0, HOME_LIST_SIZE));
        setStats({ completed: completed.length, streak: computeStreak(completed) });
      } catch (e) {
        if (!cancelled) logFirestoreQueryError("HomeContent", "listExercises", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const discardIncomplete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIncompleteExercises((prev) => prev.filter((ex) => ex.id !== id));
    try {
      await deleteCompletedExerciseAndRelatedRecords(id);
    } catch {
      // restore on failure
      const rows = await listIncompleteExercises();
      setIncompleteExercises(rows.slice(0, HOME_LIST_SIZE));
    }
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Practice</h1>
          <p className="text-muted-foreground text-sm">Pick a topic, work through it, then compare with the AI.</p>
          {stats && stats.completed > 0 ? (
            <p className="text-muted-foreground text-xs tabular-nums" data-testid="home-stats">
              {stats.completed} completed · {stats.streak} day streak
            </p>
          ) : null}
        </div>
        <Link href="/reasoning" className={cn(buttonVariants(), "inline-flex items-center gap-1.5")}>
          <Plus className="size-4" aria-hidden />
          New exercise
        </Link>
      </div>

      {incompleteExercises.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Continue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {incompleteExercises.map((ex) => (
              <div key={ex.id} className="group/item flex items-center gap-1">
                <Link href={resumeHref(ex)} className={rowLinkClass}>
                  <ExerciseRowLabel ex={ex} />
                  <ChevronRight className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
                <button
                  type="button"
                  aria-label="Discard exercise"
                  onClick={(e) => void discardIncomplete(e, ex.id)}
                  className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive focus:opacity-100"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {completedExercises.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recently completed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedExercises.map((ex) => (
              <Link
                key={ex.id}
                href={`/exercise/history?openExercise=${encodeURIComponent(ex.id)}`}
                className={rowLinkClass}
              >
                <ExerciseRowLabel ex={ex} />
                <ChevronRight className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {incompleteExercises.length === 0 && completedExercises.length === 0 && (
        <p className="text-muted-foreground text-sm italic">No exercises yet. Start with New exercise.</p>
      )}
    </main>
  );
}
