"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/toast";
import { listCompletedExercises, listIncompleteExercises } from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { getTermReviewStates, saveTermReviewStates } from "@/lib/db/term-review";
import { collectTerms, type LearnedTerm } from "@/lib/exercise/terms";
import {
  blankTerm,
  dueTerms,
  pickTermReview,
  termChoices,
  termState,
  type TermReviewStates,
} from "@/lib/exercise/term-review";
import { localDay, nextState } from "@/lib/review/schedule";
import { cn } from "@/lib/utils";

interface Loaded {
  all: LearnedTerm[];
  states: TermReviewStates;
  queue: LearnedTerm[];
}

/**
 * Review terms from "Learn first" on a 1-3-7-21 day schedule (PLAN-retention.md R2).
 * The clue is the meaning and example with the term blanked; pick the term, or with
 * fewer than 4 terms, recall it and say if you knew it.
 */
export default function TermReviewPage() {
  const { show: showToast } = useToast();
  const [today] = useState(() => localDay(new Date()));
  const [data, setData] = useState<Loaded | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [graded, setGraded] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);

  const fetchReview = async (): Promise<Loaded> => {
    try {
      const [done, open, states] = await Promise.all([
        listCompletedExercises(),
        listIncompleteExercises(),
        getTermReviewStates(),
      ]);
      const all = collectTerms([...done, ...open]);
      return { all, states, queue: pickTermReview(all, states, today) };
    } catch (e) {
      logFirestoreQueryError("TermReviewPage", "load", e);
      return { all: [], states: {}, queue: [] };
    }
  };

  useEffect(() => {
    let cancelled = false;
    void fetchReview().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Another round when more terms are due. */
  const restart = async () => {
    const d = await fetchReview();
    setIndex(0);
    setPicked(null);
    setShown(false);
    setGraded(null);
    setRight(0);
    setData(d);
  };

  const answer = (correct: boolean) => {
    if (!data) return;
    const target = data.queue[index]!;
    const states = { ...data.states, [target.key]: nextState(termState(target, data.states), correct, today) };
    setData({ ...data, states });
    if (correct) setRight((n) => n + 1);
    saveTermReviewStates(states).catch((e) => {
      logFirestoreQueryError("TermReviewPage", "save", e);
      showToast("Could not save this answer.");
    });
  };

  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null);
    setShown(false);
    setGraded(null);
  };

  const target = data?.queue[index];
  const choices = target && data ? termChoices(target, data.all, today) : null;
  const answered = picked != null || graded != null;
  const finished = data != null && data.queue.length > 0 && index >= data.queue.length;
  const moreDue = finished ? dueTerms(data.all, data.states, today).length : 0;

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader title="Review terms" sub="Name the idea from its meaning." />

      {data === null ? (
        <p className="text-muted-foreground text-body">Loading…</p>
      ) : data.queue.length === 0 ? (
        <div className="space-y-3" data-testid="term-review-empty">
          <p className="text-body">Nothing to review today.</p>
          <Link className="text-body font-medium text-foreground" href="/terms">
            My terms
          </Link>
        </div>
      ) : finished ? (
        <div className="space-y-4" data-testid="term-review-done">
          <p className="text-body">
            {right} of {data.queue.length} right.
          </p>
          <div className="flex flex-wrap gap-2">
            {moreDue > 0 ? (
              <Button type="button" onClick={() => void restart()}>
                Review {Math.min(moreDue, 5)} more
              </Button>
            ) : null}
            <Link href="/terms" className={buttonVariants({ variant: "secondary" })}>
              My terms
            </Link>
          </div>
        </div>
      ) : target ? (
        <div className="space-y-5" data-testid="term-review-question">
          <p className="text-muted-foreground text-meta">
            Term {index + 1} of {data.queue.length}
          </p>

          {choices ? (
            <>
              <div className="space-y-2 border-l-2 border-border pl-4 text-body">
                <p className="text-foreground">{blankTerm(target.plain, target.term)}</p>
                <p className="text-muted-foreground">Example: {blankTerm(target.example, target.term)}</p>
              </div>
              <div className="grid gap-2" role="radiogroup" aria-label="Which term is it?">
                {choices.map((c) => {
                  const isPicked = picked === c.key;
                  const isAnswer = picked != null && c.key === target.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      role="radio"
                      aria-checked={isPicked}
                      disabled={picked != null}
                      onClick={() => {
                        setPicked(c.key);
                        answer(c.key === target.key);
                      }}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-body disabled:cursor-default",
                        isAnswer ? "border-foreground bg-muted" : isPicked ? "border-foreground/40" : "border-border hover:bg-muted",
                      )}
                    >
                      {isAnswer ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                      {isPicked && !isAnswer ? <X className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                      <span>{c.term}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-lead font-medium text-foreground">{target.term}</p>
              {!shown ? (
                <Button type="button" variant="secondary" onClick={() => setShown(true)}>
                  Show the meaning
                </Button>
              ) : graded == null ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setGraded(true);
                      answer(true);
                    }}
                  >
                    I knew it
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setGraded(false);
                      answer(false);
                    }}
                  >
                    Not yet
                  </Button>
                </div>
              ) : null}
            </>
          )}

          {answered || shown ? (
            <div className="space-y-1 border-t border-border pt-4 text-body" data-testid="term-review-answer">
              {picked != null ? (
                <p className="font-medium">{picked === target.key ? "Right." : `Not quite: it is ${target.term}.`}</p>
              ) : null}
              <p className="text-foreground">{target.plain}</p>
              <p className="text-muted-foreground">Example: {target.example}</p>
              {target.seenIn[0] ? (
                <p className="text-muted-foreground text-meta">
                  Seen in{" "}
                  <Link
                    className="font-medium text-foreground"
                    href={`/exercise/history?openExercise=${encodeURIComponent(target.seenIn[0].id)}`}
                  >
                    {target.seenIn[0].title}
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          {answered ? (
            <Button type="button" onClick={next}>
              {index < data.queue.length - 1 ? "Next term" : "Finish"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
