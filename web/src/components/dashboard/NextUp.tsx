"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { Section, WORD_LINK } from "@/components/shared/Section";
import { buttonVariants } from "@/components/ui/button";
import { DISCARD_BUTTON_CLASS } from "@/components/dashboard/discard-button";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { currentTrack, trackProgress, trackStepHref } from "@/lib/exercise/tracks";
import {
  isSkippedToday,
  readSkippedDay,
  subscribeSkippedDay,
  writeSkippedDay,
} from "@/lib/exercise/next-up-skip";
import { localDay } from "@/lib/geo/quiz";

/** The unfinished exercise for a track step, matched by type and topic. */
export function exerciseForStep(
  incomplete: Exercise[],
  step: { type: string; domain: string } | null,
): Exercise | undefined {
  return step ? incomplete.find((e) => e.type === step.type && e.domain.trim() === step.domain) : undefined;
}

/**
 * Today's one main action: the next step of the track in progress (PLAN-refine
 * R5). Holds the page's only filled button. "not today" hides it until tomorrow.
 */
export function NextUp({
  completed,
  incomplete,
  onDiscard,
}: {
  completed: Exercise[];
  incomplete: Exercise[];
  onDiscard: (e: React.MouseEvent, id: string) => void;
}) {
  // The server has no localStorage: it renders the step, the device decides.
  const skipped = useSyncExternalStore(
    subscribeSkippedDay,
    () => isSkippedToday(readSkippedDay(), localDay(new Date())),
    () => false,
  );
  const skip = (on: boolean) => writeSkippedDay(on ? localDay(new Date()) : null);

  const track = currentTrack(completed);
  const allTracks = (
    <Link href="/tracks" className={WORD_LINK}>
      All tracks
    </Link>
  );

  if (!track) {
    return (
      <Section data-testid="track-card" title="Next up" action={allTracks}>
        <p className="text-body text-muted-foreground">You finished every track. New ones will come.</p>
      </Section>
    );
  }

  const { doneIds, next } = trackProgress(track, completed);
  const total = track.steps.length;
  const i = track.steps.findIndex((s) => s.id === next?.id);
  const inProgress = exerciseForStep(incomplete, next);

  return (
    <Section data-testid="track-card" title="Next up" action={allTracks}>
      <div
        className="h-0.5 overflow-hidden rounded-full bg-input"
        role="progressbar"
        aria-label={`${track.title} progress`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={doneIds.size}
      >
        <div className="h-full origin-left bg-foreground" style={{ transform: `scaleX(${doneIds.size / total})` }} />
      </div>
      <p className="mt-2 text-meta text-muted-foreground tabular-nums">
        {track.title} · {doneIds.size} of {total} steps done
      </p>

      {!next ? null : skipped ? (
        <p className="mt-6 text-meta text-muted-foreground" data-testid="next-up-skipped">
          Back tomorrow.{" "}
          <button type="button" className={WORD_LINK} onClick={() => skip(false)}>
            show
          </button>
        </p>
      ) : (
        <div className="mt-6">
          <p className="text-meta text-muted-foreground">
            Step {i + 1} · {TYPE_LABEL[next.type]}
          </p>
          <p className="mt-1 max-w-xl text-lead">{next.learn}</p>
          <div className="group/item mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href={inProgress ? `/exercise/${inProgress.type}?resumeId=${inProgress.id}` : trackStepHref(next)}
              className={buttonVariants()}
              data-testid="track-next-step"
            >
              {inProgress ? "Continue" : "Start"}
            </Link>
            {inProgress ? (
              <button
                type="button"
                aria-label="Discard the unfinished exercise for this step"
                onClick={(e) => onDiscard(e, inProgress.id)}
                className={DISCARD_BUTTON_CLASS}
                data-testid="track-discard"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            ) : (
              <button type="button" className={WORD_LINK} onClick={() => skip(true)} data-testid="next-up-skip">
                not today
              </button>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
