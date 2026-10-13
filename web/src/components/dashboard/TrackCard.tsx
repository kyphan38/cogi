"use client";

import Link from "next/link";
import { ChevronRight, Trash2 } from "lucide-react";
import { GO_LINK, HomeSection, WORD_LINK } from "@/components/dashboard/HomeSection";
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
    <HomeSection
      data-testid="track-card"
      title="Learning track"
      action={
        <Link href="/tracks" className={WORD_LINK}>
          All tracks
        </Link>
      }
    >
      <div className="space-y-3 text-sm">
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
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs">
                        Step {i + 1} · {TYPE_LABEL[next.type]}
                      </p>
                      <p className="text-foreground">{next.learn}</p>
                    </div>
                    <div className="group/item flex shrink-0 items-center gap-1">
                      <Link
                        href={inProgress ? `/exercise/${inProgress.type}?resumeId=${inProgress.id}` : trackStepHref(next)}
                        className={GO_LINK}
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
      </div>
    </HomeSection>
  );
}
