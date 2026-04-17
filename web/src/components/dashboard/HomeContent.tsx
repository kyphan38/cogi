"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { listActionsWithExerciseMeta } from "@/lib/db/actions";
import type { ActionBridge } from "@/lib/types/action";
import { getDb } from "@/lib/db/schema";
import { currentIsoWeekKey } from "@/lib/db/actions";
import { ChevronRight } from "lucide-react";

type ActionRow = ActionBridge & {
  exerciseTitle: string;
  exerciseCreatedAt: string;
};

const EXERCISE_CARDS: {
  href: string;
  label: string;
  title: string;
  desc: string;
  primary?: boolean;
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
];

export function HomeContent() {
  const [actions, setActions] = useState<ActionRow[]>([]);
  const weekKey = currentIsoWeekKey();

  const load = () => {
    void listActionsWithExerciseMeta().then(setActions);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleWeek = async (row: ActionBridge) => {
    const db = getDb();
    const next = [...row.weeklyFollowThrough];
    const idx = next.findIndex((w) => w.weekKey === weekKey);
    if (idx >= 0) {
      next[idx] = { ...next[idx], done: !next[idx].done };
    } else {
      next.push({ weekKey, done: true });
    }
    await db.actions.put({ ...row, weeklyFollowThrough: next });
    load();
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">cogi</p>
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Good moment to practice</h1>
        <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
          Pick a mode below. Everything stays in this browser until you export it.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {EXERCISE_CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={cn(
              "rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/35 hover:bg-muted/20",
              c.primary &&
                "border-primary/35 bg-accent/50 hover:border-primary/45 hover:bg-accent/60",
            )}
          >
            <p
              className={cn(
                "mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
                c.primary && "text-primary",
              )}
            >
              {c.label}
              {c.primary ? " · suggested today" : null}
            </p>
            <p className={cn("text-sm font-medium", c.primary && "text-primary")}>{c.title}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{c.desc}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/exercise/generative"
        className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/35 hover:bg-muted/20"
      >
        <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
          Generative
        </p>
        <p className="text-sm font-medium">Write, then stress-test your thinking</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Scaffolded prompts, short debate with the model, and a rubric snapshot.
        </p>
      </Link>

      <Link
        href="/exercise/combo"
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:border-muted-foreground/35 hover:bg-muted/20"
      >
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground mb-0.5 text-[11px] font-medium tracking-wide uppercase">
            Combo
          </p>
          <p className="text-sm font-medium">Multi-step scenario chain</p>
        </div>
        <ChevronRight
          className="pointer-events-none size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>

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
