"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  listActionsWithExerciseMeta,
  subscribeActionsWithExerciseMeta,
} from "@/lib/db/actions";
import type { ActionBridge } from "@/lib/types/action";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { listIncompleteExercises, deleteCompletedExerciseAndRelatedRecords } from "@/lib/db/exercises";
import { deleteActiveMathSession, listActiveMathSessions } from "@/lib/db/math-sessions";
import type { Exercise } from "@/lib/types/exercise";
import type { ActiveMathSession } from "@/lib/types/math-session";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";

type ActionRow = ActionBridge & {
  exerciseTitle: string;
  exerciseCreatedAt: string;
};

function resumeHref(ex: Exercise): string {
  if (ex.type === "combo") return `/exercise/combo?resumeId=${ex.id}`;
  return `/exercise/${ex.type}?resumeId=${ex.id}`;
}

const MATH_TOPIC_LABEL: Record<string, string> = {
  expected_value: "Expected Value",
  graph_theory: "Graph Theory",
  game_theory: "Game Theory",
  probability_bayes: "Probability & Bayes",
  causal_literacy: "Causal Literacy",
  exponential_power_law: "Exponential & Power Law",
};

const NOTES_PAGE_SIZE = 3;

function NotesPageControls({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous notes"
        disabled={page === 0}
        onClick={onPrev}
        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Next notes"
        disabled={page >= totalPages - 1}
        onClick={onNext}
        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function HomeContent() {
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [incompleteExercises, setIncompleteExercises] = useState<Exercise[]>([]);
  const [activeMathSessions, setActiveMathSessions] = useState<ActiveMathSession[]>([]);
  const [reasoningNotesPage, setReasoningNotesPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listActionsWithExerciseMeta();
        if (!cancelled) setActions(rows);
      } catch (e) {
        if (!cancelled) {
          logFirestoreQueryError("HomeContent", "listActionsWithExerciseMeta", e);
          setActions([]);
        }
      }
    })();
    const unsubscribe = subscribeActionsWithExerciseMeta(
      (rows) => { if (!cancelled) setActions(rows); },
      (error) => {
        if (!cancelled) logFirestoreQueryError("HomeContent", "subscribeActionsWithExerciseMeta", error);
      },
    );
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listIncompleteExercises();
        if (!cancelled) setIncompleteExercises(rows.slice(0, 5));
      } catch {
        if (!cancelled) setIncompleteExercises([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listActiveMathSessions();
        if (!cancelled) setActiveMathSessions(rows.slice(0, 5));
      } catch {
        if (!cancelled) setActiveMathSessions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const discardIncomplete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIncompleteExercises((prev) => prev.filter((ex) => ex.id !== id));
    try {
      await deleteCompletedExerciseAndRelatedRecords(id);
    } catch {
      // restore on failure
      const rows = await listIncompleteExercises();
      setIncompleteExercises(rows.slice(0, 5));
    }
  };

  const discardMathSession = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMathSessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteActiveMathSession(id);
    } catch {
      // restore on failure
      const rows = await listActiveMathSessions();
      setActiveMathSessions(rows.slice(0, 5));
    }
  };

  const reasoningTotalPages = Math.max(1, Math.ceil(actions.length / NOTES_PAGE_SIZE));
  const reasoningPage = Math.min(reasoningNotesPage, reasoningTotalPages - 1);
  const pagedActions = actions.slice(
    reasoningPage * NOTES_PAGE_SIZE,
    reasoningPage * NOTES_PAGE_SIZE + NOTES_PAGE_SIZE,
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Practice</h1>
        <div className="flex gap-2">
          <Link
            href="/reasoning"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          >
            Reasoning
          </Link>
          <Link
            href="/math"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
          >
            Math
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Continue where you left off</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="section-label">Reasoning</p>
            {incompleteExercises.length > 0 ? (
              <div className="space-y-2">
                {incompleteExercises.map((ex) => (
                  <div key={ex.id} className="group/item flex items-center gap-1">
                    <Link
                      href={resumeHref(ex)}
                      className="flex min-w-0 flex-1 items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-muted-foreground mr-2 text-xs font-medium uppercase">
                          {TYPE_LABEL[ex.type] ?? ex.type}
                        </span>
                        <span className="font-medium truncate">{ex.title}</span>
                        {ex.domain ? (
                          <span className="text-muted-foreground ml-2 text-xs">· {ex.domain}</span>
                        ) : null}
                      </div>
                      <ChevronRight className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      aria-label="Discard exercise"
                      onClick={(e) => void discardIncomplete(e, ex.id)}
                      className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive focus:opacity-100"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">No in-progress reasoning exercises.</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="section-label">Math</p>
            {activeMathSessions.length > 0 ? (
              <div className="space-y-2">
                {activeMathSessions.map((s) => (
                  <div key={s.id} className="group/item flex items-center gap-1">
                    <Link
                      href={`/math/${s.id}`}
                      className="flex min-w-0 flex-1 items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-muted-foreground mr-2 text-xs font-medium uppercase">
                          {MATH_TOPIC_LABEL[s.topic] ?? s.topic}
                        </span>
                        <span className="font-medium truncate">{s.title}</span>
                      </div>
                      <ChevronRight className="ml-3 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      aria-label="Discard scenario"
                      onClick={(e) => void discardMathSession(e, s.id)}
                      className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive focus:opacity-100"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">No in-progress math scenarios.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <p className="section-label">Learning Notes</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reasoning</CardTitle>
              <CardAction>
                <NotesPageControls
                  page={reasoningPage}
                  totalPages={reasoningTotalPages}
                  onPrev={() => setReasoningNotesPage((p) => Math.max(0, p - 1))}
                  onNext={() => setReasoningNotesPage((p) => Math.min(reasoningTotalPages - 1, p + 1))}
                />
              </CardAction>
            </CardHeader>
            <CardContent>
              {pagedActions.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No open notes.</p>
              ) : (
                <ul className="space-y-4">
                  {pagedActions.map((a) => (
                    <li key={a.id} className="rounded-lg border border-border bg-muted/10 p-3 text-sm">
                      <p className="font-medium">{a.exerciseTitle}</p>
                      <p className="text-muted-foreground mt-1">{a.oneAction}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Math</CardTitle>
              <CardAction>
                <NotesPageControls page={0} totalPages={1} onPrev={() => {}} onNext={() => {}} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm italic">No math notes yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
