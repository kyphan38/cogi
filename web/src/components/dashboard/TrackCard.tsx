"use client";

import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { currentTrack, trackProgress, trackStepHref } from "@/lib/exercise/tracks";
import { DISCARD_BUTTON_CLASS } from "@/components/dashboard/discard-button";

/** Home: the topic track in progress and its next step (PLAN-learning.md L3). */
export function TrackCard({
  completed,
  incomplete = [],
  onDiscard,
}: {
  completed: Exercise[];
  /** Unfinished exercises; one on the next step's topic is offered to continue. */
  incomplete?: Exercise[];
  onDiscard?: (e: React.MouseEvent, id: string) => void;
}) {
  const track = currentTrack(completed);
  return (
    <Card data-testid="track-card">
      <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2 pb-3">
        <CardTitle className="text-base">Learning track</CardTitle>
        <Link href="/tracks" className="text-muted-foreground text-xs underline underline-offset-4">
          All tracks
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {track ? (
          (() => {
            const { doneIds, next } = trackProgress(track, completed);
            const i = track.steps.findIndex((s) => s.id === next?.id);
            const inProgress = next
              ? incomplete.find((e) => e.type === next.type && e.domain.trim() === next.domain)
              : undefined;
            return (
              <>
                <div className="min-w-0">
                  <p className="text-foreground font-medium">{track.title}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {doneIds.size} of {track.steps.length} steps done
                  </p>
                </div>
                {next ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs">
                        Step {i + 1} · {TYPE_LABEL[next.type]}
                      </p>
                      <p className="text-foreground">{next.learn}</p>
                    </div>
                    <div className="group/item flex shrink-0 items-center gap-1">
                      <Link
                        href={inProgress ? `/exercise/${inProgress.type}?resumeId=${inProgress.id}` : trackStepHref(next)}
                        className={cn(buttonVariants({ size: "sm" }), "inline-flex shrink-0 items-center gap-1")}
                        data-testid="track-next-step"
                      >
                        {inProgress ? "Continue" : "Start"} <ChevronRight className="size-4" aria-hidden />
                      </Link>
                      {inProgress && onDiscard ? (
                        <button
                          type="button"
                          aria-label="Discard the unfinished exercise for this step"
                          onClick={(e) => onDiscard(e, inProgress.id)}
                          className={DISCARD_BUTTON_CLASS}
                          data-testid="track-discard"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            );
          })()
        ) : (
          <p className="text-muted-foreground">You finished every track. New ones will come.</p>
        )}
      </CardContent>
    </Card>
  );
}
