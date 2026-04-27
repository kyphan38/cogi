"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  listActionsWithExerciseMeta,
  subscribeActionsWithExerciseMeta,
  toggleActionFollowThroughWeek,
} from "@/lib/db/actions";
import type { ActionBridge } from "@/lib/types/action";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { ChevronRight, Trash2 } from "lucide-react";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { ExercisePickerCard } from "@/components/dashboard/ExercisePickerCard";
import { listIncompleteExercises, deleteCompletedExerciseAndRelatedRecords } from "@/lib/db/exercises";
import type { Exercise } from "@/lib/types/exercise";

type ActionRow = ActionBridge & {
  exerciseTitle: string;
  exerciseCreatedAt: string;
};

const ALL_EXERCISE_CARDS: {
  href: string;
  label: string;
  title: string;
  desc?: string;
  primary?: boolean;
  trailingIcon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}[] = [
  {
    href: "/exercise/analytical",
    label: "Analytical",
    title: "Spot flawed reasoning",
    desc: "Find embedded issues and decoys in a short passage.",
    primary: true,
  },
  {
    href: "/exercise/sequential",
    label: "Sequential",
    title: "Order a messy process",
    desc: "Drag steps into a defensible sequence with traps.",
  },
  {
    href: "/exercise/systems",
    label: "Systems",
    title: "Map feedback loops",
    desc: "Draw nodes and edges, then trace a shock ripple.",
  },
  {
    href: "/exercise/evaluative",
    label: "Evaluative",
    title: "Compare options fairly",
    desc: "Matrix or weighted scoring against hidden tradeoffs.",
  },
  {
    href: "/exercise/generative",
    label: "Generative",
    title: "Write, then stress-test your thinking",
    desc: "Scaffolded prompts, short debate with the model, and a rubric snapshot.",
  },
  {
    href: "/exercise/combo",
    label: "Combo",
    title: "Multi-step scenario chain",
    trailingIcon: ChevronRight,
    className: "sm:col-span-2",
  },
];

const TYPE_LABEL: Record<string, string> = {
  analytical: "Analytical",
  sequential: "Sequential",
  systems: "Systems",
  evaluative: "Evaluative",
  generative: "Generative",
  combo: "Combo",
};

function resumeHref(ex: Exercise): string {
  if (ex.type === "combo") return `/exercise/combo?resumeId=${ex.id}`;
  return `/exercise/${ex.type}?resumeId=${ex.id}`;
}

export function HomeContent() {
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [incompleteExercises, setIncompleteExercises] = useState<Exercise[]>([]);
  const weekKey = currentIsoWeekKey();

  useEffect(() => {
    void (async () => {
      try {
        const rows = await listActionsWithExerciseMeta();
        setActions(rows);
      } catch (e) {
        logFirestoreQueryError("HomeContent", "listActionsWithExerciseMeta", e);
        setActions([]);
      }
    })();
    const unsubscribe = subscribeActionsWithExerciseMeta(
      setActions,
      (error) => {
        logFirestoreQueryError("HomeContent", "subscribeActionsWithExerciseMeta", error);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const rows = await listIncompleteExercises();
        setIncompleteExercises(rows.slice(0, 5));
      } catch {
        setIncompleteExercises([]);
      }
    })();
  }, []);

  const toggleWeek = async (row: ActionBridge) => {
    await toggleActionFollowThroughWeek(row, weekKey);
  };

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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">cogi</p>
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Good moment to practice</h1>
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          Pick a mode below. Completed work is saved to your signed-in account (Firebase). Use Settings
          for a JSON backup copy anytime.
        </p>
      </div>

      {incompleteExercises.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Continue where you left off</CardTitle>
            <CardDescription>In-progress exercises - pick up where you stopped.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {ALL_EXERCISE_CARDS.map((c) => (
          <ExercisePickerCard
            key={c.href}
            href={c.href}
            label={c.label}
            title={c.title}
            desc={c.desc}
            primary={c.primary}
            trailingIcon={c.trailingIcon}
            className={c.className}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open actions</CardTitle>
          <CardDescription>
            Commitments from the end of exercises. Week: {weekKey}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">
              Nothing here yet - finish an exercise and write one concrete action to see it listed.
            </p>
          ) : (
            <ul className="space-y-4">
              {actions.map((a) => {
                const w = a.weeklyFollowThrough.find((x) => x.weekKey === weekKey);
                const done = w?.done ?? false;
                return (
                  <li key={a.id} className="rounded-lg border border-border bg-muted/10 p-3 text-sm">
                    <p className="font-medium">{a.exerciseTitle}</p>
                    <p className="text-muted-foreground mt-1">{a.oneAction}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`wk-${a.id}`}
                        checked={done}
                        onChange={() => void toggleWeek(a)}
                        className="size-4 accent-primary"
                      />
                      <Label htmlFor={`wk-${a.id}`} className="font-normal">
                        Follow-through this week
                      </Label>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
