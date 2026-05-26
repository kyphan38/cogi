"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DomainInput } from "@/components/shared/DomainInput";
import { listIncompleteExercises, listRecentDomains, deleteCompletedExerciseAndRelatedRecords } from "@/lib/db/exercises";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import type { Exercise } from "@/lib/types/exercise";

type ActionRow = ActionBridge & {
  exerciseTitle: string;
  exerciseCreatedAt: string;
};

const ALL_EXERCISE_CARDS: {
  type: string;
  href: string;
  label: string;
  title: string;
  desc?: string;
  trailingIcon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}[] = [
  {
    type: "analytical",
    href: "/exercise/analytical",
    label: "Analytical",
    title: "Spot flawed reasoning",
    desc: "Find embedded issues and decoys in a short passage.",
  },
  {
    type: "sequential",
    href: "/exercise/sequential",
    label: "Sequential",
    title: "Order a messy process",
    desc: "Drag steps into a defensible sequence with traps.",
  },
  {
    type: "systems",
    href: "/exercise/systems",
    label: "Systems",
    title: "Map feedback loops",
    desc: "Draw nodes and edges, then trace a shock ripple.",
  },
  {
    type: "evaluative",
    href: "/exercise/evaluative",
    label: "Evaluative",
    title: "Compare options fairly",
    desc: "Matrix or weighted scoring against hidden tradeoffs.",
  },
  {
    type: "generative",
    href: "/exercise/generative",
    label: "Generative",
    title: "Write, then stress-test your thinking",
    desc: "Scaffolded prompts, short debate with the model, and a rubric snapshot.",
  },
  {
    type: "combo",
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

type ModeRecommendation = { mode: string; reason: string };

/** SessionStorage key for passing source text from Home → exercise flow. */
export const HOME_SOURCE_TEXT_KEY = "cogi:home-source-text";

export function HomeContent() {
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [incompleteExercises, setIncompleteExercises] = useState<Exercise[]>([]);
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState<"generated" | "real_data" | "custom_scenario">("generated");
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [realDataText, setRealDataText] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<ModeRecommendation[] | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const weekKey = currentIsoWeekKey();

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
    void listRecentDomains(20).then((d) => { if (!cancelled) setDomainSuggestions(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const recMap = useMemo(() => {
    if (!recommendations) return null;
    const map = new Map<string, string>();
    for (const r of recommendations) map.set(r.mode, r.reason);
    return map;
  }, [recommendations]);

  const orderedCards = useMemo(() => {
    if (!recMap) return ALL_EXERCISE_CARDS;
    const ranked = ALL_EXERCISE_CARDS
      .filter((c) => c.type !== "combo")
      .sort((a, b) => {
        const idxA = recommendations!.findIndex((r) => r.mode === a.type);
        const idxB = recommendations!.findIndex((r) => r.mode === b.type);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
    const combo = ALL_EXERCISE_CARDS.find((c) => c.type === "combo");
    return combo ? [...ranked, combo] : ranked;
  }, [recMap, recommendations]);

  const fetchRecommendation = useCallback(async () => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setRecLoading(true);
    try {
      const res = await aiFetch("/api/ai/recommend-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      });
      const json = await safeAiJson<{ ok: boolean; recommendations?: ModeRecommendation[] }>(res);
      if (json.ok && json.recommendations) {
        setRecommendations(json.recommendations);
      }
    } catch {
      // silently fall back to default order
    } finally {
      setRecLoading(false);
    }
  }, [topic]);

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
          Enter a topic to find the best mode, or pick one directly below. Completed work is saved
          to your signed-in account (Firebase). Use Settings for a JSON backup copy anytime.
        </p>
      </div>

      <Link
        href="/guide"
        className="block rounded-2xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm transition-colors hover:bg-zinc-100"
      >
        <span className="font-medium text-zinc-900">New to Cogi?</span>
        <span className="text-zinc-600">
          {" "}
          Read the full guide - every exercise type, Dashboard, History, Settings, and more.
        </span>
      </Link>

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

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div className="min-w-0">
            <Label className="mb-1.5 block text-sm font-medium">Domain</Label>
            <DomainInput
              value={topic}
              onChange={(v) => {
                setTopic(v);
                if (!v.trim()) setRecommendations(null);
              }}
              suggestions={domainSuggestions}
              placeholder="e.g. Information Warfare, DevOps / SRE"
            />
          </div>
          <div className="min-w-0">
            <Label className="mb-1.5 block text-sm font-medium">Source</Label>
            <Select
              value={source}
              onValueChange={(v) =>
                setSource((v as "generated" | "real_data" | "custom_scenario") ?? "generated")
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generated">AI-generated</SelectItem>
                <SelectItem value="real_data">Use my own text</SelectItem>
                <SelectItem value="custom_scenario">My scenario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={recLoading || !topic.trim()}
            onClick={() => void fetchRecommendation()}
          >
            {recLoading ? (
              <>
                <InlineSpinner /> Finding…
              </>
            ) : (
              "Find best mode"
            )}
          </Button>
        </div>
        {source === "custom_scenario" ? (
          <div>
            <Label className="mb-1.5 block text-sm font-medium" htmlFor="home-custom-scenario">
              Describe your situation - AI will design the exercise around it
            </Label>
            <Textarea
              id="home-custom-scenario"
              rows={4}
              value={customScenarioText}
              onChange={(e) => setCustomScenarioText(e.target.value)}
              placeholder="Paste context, stakeholders, and the tension you want to practice..."
              className="min-h-[4rem]"
            />
          </div>
        ) : null}
        {source === "real_data" ? (
          <div>
            <Label className="mb-1.5 block text-sm font-medium" htmlFor="home-real-data">
              Paste your own content (up to 2,000 words)
            </Label>
            <Textarea
              id="home-real-data"
              rows={4}
              value={realDataText}
              onChange={(e) => setRealDataText(e.target.value)}
              placeholder="Paste an email, plan, or article you want to analyze..."
              className="min-h-[4rem]"
            />
          </div>
        ) : null}
        {recommendations && topic.trim() ? (
          <p className="text-muted-foreground text-xs">
            Recommended order for <span className="font-medium text-zinc-700">{topic.trim()}</span> — pick any mode, or{" "}
            <button
              type="button"
              className="underline hover:text-zinc-900"
              onClick={() => {
                setRecommendations(null);
                setTopic("");
              }}
            >
              clear
            </button>
          </p>
        ) : null}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {orderedCards.map((c, i) => {
          const isTopRec = recMap !== null && i === 0 && c.type !== "combo";
          const domainParam = topic.trim() ? `?domain=${encodeURIComponent(topic.trim())}` : "";
          const sourceParam = domainParam && source !== "generated" ? `&source=${source}` : "";
          const autoParam = isTopRec && domainParam ? "&autoGenerate=1" : "";
          const href = c.type === "combo" ? c.href : `${c.href}${domainParam}${sourceParam}${autoParam}`;
          const needsSessionData = isTopRec && domainParam && source !== "generated";
          return (
            <ExercisePickerCard
              key={c.type}
              href={href}
              label={c.label}
              title={c.title}
              desc={c.desc}
              recommended={isTopRec}
              reason={isTopRec ? recMap?.get(c.type) : undefined}
              trailingIcon={c.trailingIcon}
              className={c.className}
              onClick={needsSessionData ? () => {
                try {
                  sessionStorage.setItem(
                    HOME_SOURCE_TEXT_KEY,
                    JSON.stringify({
                      source,
                      customScenarioText: source === "custom_scenario" ? customScenarioText : undefined,
                      realDataText: source === "real_data" ? realDataText : undefined,
                    }),
                  );
                } catch {
                  // sessionStorage unavailable -- exercise flow will fall back to step 0
                }
              } : undefined}
            />
          );
        })}
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
