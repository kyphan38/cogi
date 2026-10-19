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

const AREA_LABELS = {
  finance: "Finance",
  economics: "Economics",
  geopolitics: "Geopolitics",
} as const;

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
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Learning tracks</h1>
        <p className="text-muted-foreground text-sm">
          One exercise a day, in order.
        </p>
        <div className="flex flex-col gap-1">
          <Link
            href="/simulators"
            className="text-sm after:ml-1 after:content-['›']"
          >
            Simulators: play with loans, savings and import prices
          </Link>
          <Link
            href="/geo"
            className="text-sm after:ml-1 after:content-['›']"
            data-testid="tracks-geo-lab-link"
          >
            Geo Lab: maps, sea routes and a daily map quiz
          </Link>
        </div>
      </div>
      {TRACKS.map((track) => {
        const { doneIds, next } = trackProgress(track, completed ?? []);
        return (
          <Card key={track.id} data-testid="track">
            <CardHeader className="pb-3">
              <p className="text-muted-foreground text-xs uppercase">
                {AREA_LABELS[track.area]}
              </p>
              <CardTitle className="text-base">{track.title}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {track.description}
              </p>
              {track.area === "geopolitics" ? (
                <Link
                  href="/geo"
                  className="text-xs after:ml-1 after:content-['›']"
                  data-testid="track-geo-lab-link"
                >
                  See it on the map in the Geo Lab
                </Link>
              ) : null}
              {track.simulator ? (
                <Link
                  href={`/simulators#${track.simulator}`}
                  className="text-xs after:ml-1 after:content-['›']"
                  data-testid="track-simulator-link"
                >
                  Try the simulator for this track
                </Link>
              ) : null}
            </CardHeader>
            <CardContent>
              <ol className="divide-y border-y">
                {track.steps.map((step, i) => {
                  const done = doneIds.has(step.id);
                  const isNext = next?.id === step.id;
                  return (
                    <li
                      key={step.id}
                      className={cn(
                        "group flex items-start gap-3 py-2.5 text-sm",
                        isNext && "font-medium",
                      )}
                      data-testid="track-step"
                      data-done={done ? "true" : undefined}
                    >
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums">
                        {done ? (
                          <Check className="size-3" aria-label="Done" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs">
                          {TYPE_LABEL[step.type]}
                        </p>
                        <p
                          className={cn(
                            done ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {step.learn}
                        </p>
                      </div>
                      {/* Only the next step shows its link; the others wait for the pointer
                          (always shown on touch screens, which have no hover). */}
                      <Link
                        href={trackStepHref(step)}
                        className={cn(
                          "shrink-0 text-xs after:ml-1 after:content-['›']",
                          !isNext &&
                            "opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-60",
                        )}
                      >
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
