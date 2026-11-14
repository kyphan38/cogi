"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listCompletedExercises } from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { currentTrack, TRACKS, trackProgress, trackStepHref, type Track } from "@/lib/exercise/tracks";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/Section";
import { ExploreTabs } from "@/components/shell/ExploreTabs";

const AREA_LABELS = {
  finance: "Finance",
  economics: "Economics",
  geopolitics: "Geopolitics",
  business: "Business",
  society: "Society & media",
  politics: "Politics",
} as const;

const GO = "shrink-0 text-body after:ml-1 after:content-['›']";

/** A thin progress bar; scaleX so a change can animate on transform only. */
function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div
      className="h-0.5 overflow-hidden rounded-full bg-input"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
    >
      <div className="h-full origin-left bg-foreground" style={{ transform: `scaleX(${done / total})` }} />
    </div>
  );
}

/**
 * A track's links and steps. Done steps are muted with "done"; the next step
 * is medium with Start (a filled button only for your track); later steps
 * show Start when the pointer is on them.
 */
function TrackSteps({ track, completed, main }: { track: Track; completed: Exercise[]; main: boolean }) {
  const { doneIds, next } = trackProgress(track, completed);
  return (
    <div className="space-y-3">
      {track.area === "geopolitics" || track.simulator ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-meta">
          {track.area === "geopolitics" ? (
            <Link href="/geo" className={cn(GO, "text-meta text-muted-foreground hover:text-foreground")} data-testid="track-geo-lab-link">
              See it on the map
            </Link>
          ) : null}
          {track.simulator ? (
            <Link
              href={`/simulators#${track.simulator}`}
              className={cn(GO, "text-meta text-muted-foreground hover:text-foreground")}
              data-testid="track-simulator-link"
            >
              Try the simulator
            </Link>
          ) : null}
        </div>
      ) : null}
      <ol className="border-b border-border">
        {track.steps.map((step, i) => {
          const done = doneIds.has(step.id);
          const isNext = next?.id === step.id;
          return (
            <li
              key={step.id}
              className="group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-border py-3"
              data-testid="track-step"
              data-done={done ? "true" : undefined}
            >
              <span className={cn("text-meta tabular-nums", isNext ? "font-medium text-foreground" : "text-muted-foreground")}>
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className={cn("text-body", done && "text-muted-foreground", isNext && "font-medium")}>{step.learn}</p>
                <p className="text-meta text-muted-foreground">{TYPE_LABEL[step.type]}</p>
              </div>
              {isNext && main ? (
                <Link href={trackStepHref(step)} className={cn(buttonVariants(), "self-center")} data-testid="track-step-start">
                  Start
                </Link>
              ) : (
                <span className="flex items-baseline gap-3">
                  {done ? <span className="text-meta text-muted-foreground">done</span> : null}
                  {/* The next step's link always shows; the others wait for the pointer
                      (faint but visible on touch screens, which have no hover). */}
                  <Link
                    href={trackStepHref(step)}
                    className={cn(
                      GO,
                      isNext
                        ? "font-medium text-foreground"
                        : "text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-60",
                    )}
                  >
                    {done ? "Again" : "Start"}
                  </Link>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * All topic tracks (PLAN-refine R7): your track open at the top, every other
 * track one row with its progress, opened in place on tap.
 */
export default function TracksPage() {
  const [completed, setCompleted] = useState<Exercise[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    void listCompletedExercises()
      .then(setCompleted)
      .catch((e) => {
        logFirestoreQueryError("TracksPage", "listCompletedExercises", e);
        setCompleted([]);
      });
  }, []);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rows = completed ?? [];
  const mine = completed ? currentTrack(completed) : null;
  const others = TRACKS.filter((t) => t.id !== mine?.id);

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <div className="space-y-3">
        <PageHeader title="Learning tracks" sub="One exercise a day, in order." />
        <ExploreTabs />
      </div>

      {mine ? (
        <Section title="Your track" data-testid="track" data-current="true">
          <div className="space-y-4">
            <div>
              <p className="text-lead">{mine.title}</p>
              <p className="text-meta text-muted-foreground tabular-nums">
                {AREA_LABELS[mine.area]} · {trackProgress(mine, rows).doneIds.size} of {mine.steps.length} done
              </p>
            </div>
            <ProgressBar
              done={trackProgress(mine, rows).doneIds.size}
              total={mine.steps.length}
              label={`${mine.title} progress`}
            />
            <p className="max-w-xl text-body text-muted-foreground">{mine.description}</p>
            <TrackSteps track={mine} completed={rows} main />
          </div>
        </Section>
      ) : null}

      {completed ? (
        <Section title={mine ? "All tracks" : "Tracks"}>
          <div className="border-b border-border">
            {others.map((track) => {
              const done = trackProgress(track, rows).doneIds.size;
              const isOpen = open.has(track.id);
              return (
                <div key={track.id} className="border-t border-border" data-testid="track">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(track.id)}
                    className="group/row grid w-full grid-cols-[minmax(0,1fr)_5rem_auto] items-center gap-x-4 py-3 text-left sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:gap-x-6"
                  >
                    <span className="min-w-0">
                      <span className="block text-body">{track.title}</span>
                      <span className="block text-meta text-muted-foreground">{AREA_LABELS[track.area]}</span>
                    </span>
                    <span>
                      <ProgressBar done={done} total={track.steps.length} label={`${track.title} progress`} />
                      <span className="mt-1.5 block text-meta text-muted-foreground tabular-nums">
                        {done} of {track.steps.length}
                      </span>
                    </span>
                    <span className="w-10 text-right text-body text-muted-foreground transition-colors group-hover/row:text-foreground">
                      {isOpen ? "Close" : "Open"}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="space-y-3 pb-5">
                      <p className="max-w-xl text-body text-muted-foreground">{track.description}</p>
                      <TrackSteps track={track} completed={rows} main={false} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}
    </main>
  );
}
