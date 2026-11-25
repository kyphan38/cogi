"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Section, WORD_LINK } from "@/components/shared/Section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DISCARD_BUTTON_CLASS } from "@/components/dashboard/discard-button";
import { startRedo } from "@/lib/db/redo";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import type { PracticeRow } from "@/lib/exercise/redo";
import {
  isSkippedToday,
  readSkippedDay,
  subscribeSkippedDay,
  writeSkippedDay,
} from "@/lib/exercise/next-up-skip";
import { localDay } from "@/lib/review/schedule";
import {
  exerciseForGenStep,
  genTrackProgress,
  isStale,
  stepHref,
  type GenTrack,
} from "@/lib/tracks/adaptive";
import { ownPrompts } from "@/lib/tracks/own-prompts";
import { stepKindLine, stepTitle } from "@/lib/tracks/step-text";
import type { Exercise } from "@/lib/types/exercise";

/**
 * Today's one main action: the next step of the adaptive track
 * (PLAN-adaptive-tracks.md A3). Holds the page's only filled button.
 * "not today" hides it until tomorrow; "skip" passes the step for good.
 */
export function NextUp({
  track,
  completed,
  incomplete,
  busy,
  onDiscard,
  onSkip,
  onCloseStale,
}: {
  track: GenTrack;
  completed: Exercise[];
  incomplete: Exercise[];
  busy: boolean;
  onDiscard: (e: React.MouseEvent, id: string) => void;
  onSkip: (stepId: string) => void;
  onCloseStale: () => void;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  // The server has no localStorage: it renders the step, the device decides.
  const skippedToday = useSyncExternalStore(
    subscribeSkippedDay,
    () => isSkippedToday(readSkippedDay(), localDay(new Date())),
    () => false,
  );
  const notToday = (on: boolean) => writeSkippedDay(on ? localDay(new Date()) : null);

  const { doneIds, next } = genTrackProgress(track, completed);
  const total = track.steps.length;
  const passed = track.steps.filter((s) => doneIds.has(s.id) || s.skipped).length;
  const i = track.steps.findIndex((s) => s.id === next?.id);
  const inProgress = exerciseForGenStep(incomplete, next);
  const redoOf = next?.kind === "redo" ? completed.find((e) => e.id === next.redoOf) : undefined;
  const stale = isStale(track, completed, localDay(new Date()));

  const startRedoStep = async () => {
    if (!next || !redoOf || opening) return;
    setOpening(true);
    try {
      router.push(await startRedo(redoOf as PracticeRow, next.id));
    } catch {
      setOpening(false);
    }
  };

  const allTracks = (
    <Link href="/tracks" className={WORD_LINK}>
      All tracks
    </Link>
  );

  const skipLink = next ? (
    <button type="button" className={WORD_LINK} onClick={() => onSkip(next.id)} disabled={busy} data-testid="track-skip">
      skip
    </button>
  ) : null;

  let start: React.ReactNode = null;
  if (next && inProgress) {
    start = (
      <Link href={`/exercise/${inProgress.type}?resumeId=${inProgress.id}`} className={buttonVariants()} data-testid="track-next-step">
        Continue
      </Link>
    );
  } else if (next?.kind === "redo") {
    // The first try may have been deleted: then only skip is left.
    start = redoOf ? (
      <button type="button" className={buttonVariants()} onClick={() => void startRedoStep()} disabled={opening} data-testid="track-next-step">
        {opening ? "Opening" : "Start"}
      </button>
    ) : null;
  } else if (next) {
    start = (
      <Link href={stepHref(next)} className={buttonVariants()} data-testid="track-next-step">
        Start
      </Link>
    );
  }

  return (
    <Section data-testid="track-card" title="Next up" action={allTracks}>
      <div
        className="h-0.5 overflow-hidden rounded-full bg-input"
        role="progressbar"
        aria-label={`Track ${track.n} progress`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={passed}
      >
        <div className="h-full origin-left bg-foreground" style={{ transform: `scaleX(${passed / total})` }} />
      </div>
      <p className="mt-2 text-meta text-muted-foreground tabular-nums">
        Track {track.n} · {doneIds.size} of {total} done
      </p>

      {!next ? null : skippedToday ? (
        <p className="mt-6 text-meta text-muted-foreground" data-testid="next-up-skipped">
          Back tomorrow.{" "}
          <button type="button" className={WORD_LINK} onClick={() => notToday(false)}>
            show
          </button>
        </p>
      ) : (
        <div className="mt-6" data-testid="track-step-now" data-kind={next.kind}>
          <p className="text-meta text-muted-foreground">
            Step {i + 1} · {TYPE_LABEL[next.type] ?? next.type} · {stepKindLine(next)}
          </p>
          <p className="mt-1 max-w-xl text-lead">{stepTitle(next)}</p>
          {next.kind === "own" && !inProgress ? (
            <ul className="mt-3 space-y-1 text-body text-muted-foreground" data-testid="own-prompts">
              {ownPrompts(next.type).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
          <div className="group/item mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            {start}
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
              <>
                {/* The own step's skip sits right next to Start: some weeks have no fitting situation. */}
                {skipLink}
                <button type="button" className={WORD_LINK} onClick={() => notToday(true)} data-testid="next-up-skip">
                  not today
                </button>
              </>
            )}
          </div>
          {stale ? (
            <button
              type="button"
              className={cn(WORD_LINK, "mt-4 block")}
              onClick={onCloseStale}
              disabled={busy}
              data-testid="track-close-stale"
            >
              close and make a new one
            </button>
          ) : null}
        </div>
      )}
    </Section>
  );
}
