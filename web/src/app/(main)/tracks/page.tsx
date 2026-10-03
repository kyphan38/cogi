"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listCompletedExercises } from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { TRACKS, trackProgress, trackStepHref } from "@/lib/exercise/tracks";

const AREA_LABELS = { finance: "Finance", economics: "Economics", geopolitics: "Geopolitics" } as const;

/** All topic tracks with their steps and progress (PLAN-learning.md L3). */
export default function TracksPage() {
  const [completed, setCompleted] = useState<Exercise[] | null>(null);

  useEffect(() => {
    void listCompletedExercises()
      .then(setCompleted)
      .catch((e) => {
        logFirestoreQueryError("TracksPage", "listCompletedExercises", e);
        setCompleted([]);
      });
  }, []);

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Learning tracks</h1>
        <p className="text-muted-foreground text-sm">
          Short paths through economics, finance and geopolitics. Each step is one exercise at your level.
          Do them in order, one a day is plenty.
        </p>
      </div>
      {TRACKS.map((track) => {
        const { doneIds, next } = trackProgress(track, completed ?? []);
        return (
          <Card key={track.id} data-testid="track">
            <CardHeader className="pb-3">
              <p className="text-muted-foreground text-xs uppercase">{AREA_LABELS[track.area]}</p>
              <CardTitle className="text-base">{track.title}</CardTitle>
              <p className="text-muted-foreground text-sm">{track.description}</p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {track.steps.map((step, i) => {
                  const done = doneIds.has(step.id);
                  const isNext = next?.id === step.id;
                  return (
                    <li
                      key={step.id}
                      className={cn("flex items-start gap-3 rounded-md border px-3 py-2 text-sm", isNext && "border-foreground/40")}
                      data-testid="track-step"
                      data-done={done ? "true" : undefined}
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums">
                        {done ? <Check className="size-3" aria-label="Done" /> : i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs">{TYPE_LABEL[step.type]}</p>
                        <p className={cn(done ? "text-muted-foreground" : "text-foreground")}>{step.learn}</p>
                      </div>
                      <Link href={trackStepHref(step)} className="shrink-0 text-xs underline underline-offset-4">
                        {done ? "Again" : "Start"}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        );
      })}
    </main>
  );
}
