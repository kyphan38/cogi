"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import {
  deleteExercise,
  listCompletedExercises,
  listIncompleteExercises,
} from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import type { Exercise } from "@/lib/types/exercise";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { computeStreak } from "@/lib/exercise/streak";
import { currentTrack, trackProgress } from "@/lib/exercise/tracks";
import { Section } from "@/components/shared/Section";
import { PageHeader } from "@/components/shared/PageHeader";
import { NextUp, exerciseForStep } from "@/components/dashboard/NextUp";
import { HomeExplore } from "@/components/dashboard/HomeExplore";
import { DISCARD_BUTTON_CLASS } from "@/components/dashboard/discard-button";

/** How many unfinished exercises the page lists. */
const HOME_LIST_SIZE = 5;

function resumeHref(ex: Exercise): string {
  return `/exercise/${ex.type}?resumeId=${ex.id}`;
}

const noSubscribe = () => () => {};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

/**
 * Today (PLAN-refine R5): one main action (the next track step), a way to
 * start your own, unfinished work, and the Explore tools. Past work lives in
 * History.
 */
export function HomeContent() {
  const [completed, setCompleted] = useState<Exercise[] | null>(null);
  const [incomplete, setIncomplete] = useState<Exercise[]>([]);
  // The device's date, not the server's: nothing on the server, the date in the browser.
  const today = useSyncExternalStore(noSubscribe, () => DATE_FORMAT.format(new Date()), () => null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [inc, done] = await Promise.all([listIncompleteExercises(), listCompletedExercises()]);
        if (cancelled) return;
        setIncomplete(inc);
        setCompleted(done);
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
    // A stray tap on a phone should not lose work.
    if (!window.confirm("Discard this unfinished exercise? This cannot be undone.")) return;
    setIncomplete((prev) => prev.filter((ex) => ex.id !== id));
    try {
      await deleteExercise(id);
    } catch {
      setIncomplete(await listIncompleteExercises());
    }
  };

  const stats = completed && completed.length > 0 ? { n: completed.length, streak: computeStreak(completed) } : null;

  // The track step's own unfinished exercise is already under Next up.
  const track = completed ? currentTrack(completed) : null;
  const stepExercise = track && completed ? exerciseForStep(incomplete, trackProgress(track, completed).next) : undefined;
  const inProgress = incomplete.filter((ex) => ex.id !== stepExercise?.id).slice(0, HOME_LIST_SIZE);

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader
        title="Today"
        sub={
          today || stats ? (
            <span className="text-meta">
              {today}
              {today && stats ? " · " : null}
              {stats ? (
                <span className="tabular-nums" data-testid="home-stats">
                  {stats.n} completed · {stats.streak} day streak
                </span>
              ) : null}
            </span>
          ) : undefined
        }
      />

      {completed ? <NextUp completed={completed} incomplete={incomplete} onDiscard={discardIncomplete} /> : null}

      <Section title="Start your own">
        <Link
          href="/reasoning"
          className="group/new flex h-12 items-center justify-between gap-4 rounded-lg border border-input bg-card px-4 transition-colors hover:border-foreground/40"
        >
          <span className="min-w-0 truncate text-body text-muted-foreground">A decision, a claim, a news story…</span>
          <span className="shrink-0 text-sm text-muted-foreground transition-colors after:ml-1 after:content-['›'] group-hover/new:text-foreground">
            New exercise
          </span>
        </Link>
      </Section>

      {inProgress.length > 0 ? (
        <Section title="In progress">
          <div className="border-b border-border">
            {inProgress.map((ex) => (
              <div key={ex.id} className="group/item flex min-w-0 items-center gap-1 border-t border-border">
                <Link href={resumeHref(ex)} className="group/row flex min-w-0 flex-1 items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body">{ex.title}</p>
                    <p className="truncate text-meta text-muted-foreground">
                      {TYPE_LABEL[ex.type] ?? ex.type}
                      {ex.domain ? ` · ${ex.domain}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-foreground after:ml-1 after:content-['›']">Continue</span>
                </Link>
                <button
                  type="button"
                  aria-label="Discard exercise"
                  onClick={(e) => void discardIncomplete(e, ex.id)}
                  className={DISCARD_BUTTON_CLASS}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <HomeExplore completed={completed} />
    </main>
  );
}
