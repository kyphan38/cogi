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
import { ChevronRight } from "lucide-react";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { ExercisePickerCard } from "@/components/dashboard/ExercisePickerCard";

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

export function HomeContent() {
  const [actions, setActions] = useState<ActionRow[]>([]);
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

  const toggleWeek = async (row: ActionBridge) => {
    await toggleActionFollowThroughWeek(row, weekKey);
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
              Nothing here yet — finish an exercise and write one concrete action to see it listed.
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
