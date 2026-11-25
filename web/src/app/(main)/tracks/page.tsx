"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listCompletedExercises } from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { TRACKS, trackProgress, trackStepHref, type Track } from "@/lib/exercise/tracks";
import { getAdaptiveTracks } from "@/lib/db/adaptive-tracks";
import { formatDay } from "@/lib/history";
import { genTrackProgress, stepHref, type AdaptiveTracksDoc, type GenTrack, type TrackRecap } from "@/lib/tracks/adaptive";
import { stepKindLine, stepTitle } from "@/lib/tracks/step-text";
import { RecapBody } from "@/components/tracks/RecapBody";
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
 * A topic pack's links and steps. Done steps are muted with "done"; the next step's
 * Start always shows; later steps show Start when the pointer is on them.
 */
function TrackSteps({ track, completed }: { track: Track; completed: Exercise[] }) {
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
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The adaptive track's six steps with where each one stands. Start for the next one (a redo starts on Today). */
function YourTrack({ track, completed }: { track: GenTrack; completed: Exercise[] }) {
  const { doneIds, next } = genTrackProgress(track, completed);
  const passed = track.steps.filter((s) => doneIds.has(s.id) || s.skipped).length;
  return (
    <div className="space-y-4">
      <p className="text-meta text-muted-foreground tabular-nums">
        Track {track.n} · {doneIds.size} of {track.steps.length} done
      </p>
      <ProgressBar done={passed} total={track.steps.length} label={`Track ${track.n} progress`} />
      <ol className="border-b border-border">
        {track.steps.map((step, i) => {
          const done = doneIds.has(step.id);
          const isNext = next?.id === step.id;
          return (
            <li
              key={step.id}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-border py-3"
              data-testid="gen-step"
              data-state={done ? "done" : step.skipped ? "skipped" : isNext ? "next" : "later"}
            >
              <span className={cn("text-meta tabular-nums", isNext ? "font-medium text-foreground" : "text-muted-foreground")}>{i + 1}</span>
              <div className="min-w-0">
                <p className={cn("text-body", (done || step.skipped) && "text-muted-foreground", isNext && "font-medium")}>{stepTitle(step)}</p>
                <p className="text-meta text-muted-foreground">
                  {TYPE_LABEL[step.type] ?? step.type} · {stepKindLine(step)}
                </p>
              </div>
              {done || step.skipped ? (
                <span className="text-meta text-muted-foreground">{done ? "done" : "skipped"}</span>
              ) : isNext ? (
                <Link
                  href={step.kind === "redo" ? "/" : stepHref(step)}
                  className={cn(buttonVariants(), "self-center")}
                  data-testid="gen-step-start"
                >
                  {step.kind === "redo" ? "On Today" : "Start"}
                </Link>
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Closed tracks, newest first; a row opens its recap in place. */
function PastTracks({ past }: { past: TrackRecap[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="border-b border-border">
      {past.map((r, i) => {
        const isOpen = open === r.id;
        const cleared = r.targets.filter((t) => t.cleared).length;
        return (
          <div key={r.id} className="border-t border-border" data-testid="past-track">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : r.id)}
              className="group/row flex w-full items-center justify-between gap-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-body">Track {r.n}</span>
                <span className="block text-meta text-muted-foreground tabular-nums">
                  {formatDay(r.closedAt)} · {r.done} of {r.total}
                  {cleared ? ` · ${cleared} cleared` : ""}
                </span>
              </span>
              <span className="w-10 text-right text-body text-muted-foreground transition-colors group-hover/row:text-foreground">
                {isOpen ? "Close" : "Open"}
              </span>
            </button>
            {isOpen ? (
              <div className="pb-5">
                <RecapBody recap={r} previous={past[i + 1]} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * All topic tracks (PLAN-refine R7): your track open at the top, every other
 * track one row with its progress, opened in place on tap.
 */
export default function TracksPage() {
  const [completed, setCompleted] = useState<Exercise[] | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveTracksDoc | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    void listCompletedExercises()
      .then(setCompleted)
      .catch((e) => {
        logFirestoreQueryError("TracksPage", "listCompletedExercises", e);
        setCompleted([]);
      });
    // Read only: Today builds and closes tracks.
    void getAdaptiveTracks()
      .then(setAdaptive)
      .catch((e) => logFirestoreQueryError("TracksPage", "getAdaptiveTracks", e));
  }, []);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rows = completed ?? [];

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <div className="space-y-3">
        <PageHeader title="Learning tracks" sub="Six steps at a time, made from your results." />
        <ExploreTabs />
      </div>

      {completed && adaptive?.current ? (
        <Section title="Your track" data-testid="your-track">
          <YourTrack track={adaptive.current} completed={rows} />
        </Section>
      ) : null}

      {adaptive?.past.length ? (
        <Section title="Past tracks" data-testid="past-tracks">
          <PastTracks past={adaptive.past} />
        </Section>
      ) : null}

      {completed ? (
        <Section title="Topic packs" data-testid="topic-packs">
          <p className="mb-4 max-w-xl text-meta text-muted-foreground">Your track takes new topics from here. Steps you do here do not count in it.</p>
          <div className="border-b border-border">
            {TRACKS.map((track) => {
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
                      <TrackSteps track={track} completed={rows} />
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
