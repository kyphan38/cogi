"use client";

import { useEffect, useState } from "react";

import { PRACTICE_EXERCISE_CARDS } from "@/lib/exercise/exercise-mode-cards";
import { listRecentDomains } from "@/lib/db/exercises";
import { ModeTopicPanel } from "@/components/dashboard/ModeTopicPanel";
import { TopicIdeasPanel } from "@/components/dashboard/TopicIdeasPanel";
import { cn } from "@/lib/utils";
import type { ThinkingType } from "@/lib/types/exercise";

/** Remembers "start from a topic / a mode" on this device. */
const START_FROM_KEY = "cogi:practice-start-from";

type StartFrom = "topic" | "mode";

/**
 * New exercise. "A topic": filters, Generate, and 10 concrete topics, each with its mode,
 * or your own scenario (PLAN-topic-ideas.md T2). "A mode": pick the skill first.
 */
export default function ReasoningPage() {
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [startFrom, setStartFrom] = useState<StartFrom>("topic");
  const [pickedMode, setPickedMode] = useState<ThinkingType | null>(null);

  useEffect(() => {
    try {
      // Read after mount so the server and first client render match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(START_FROM_KEY) === "mode") setStartFrom("mode");
    } catch {
      // Storage blocked: start from a topic.
    }
  }, []);

  const chooseStart = (next: StartFrom) => {
    setStartFrom(next);
    try {
      localStorage.setItem(START_FROM_KEY, next);
    } catch {
      // Only a convenience.
    }
  };

  useEffect(() => {
    let cancelled = false;
    void listRecentDomains(20).then((d) => { if (!cancelled) setDomainSuggestions(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">New exercise</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Applied critical thinking, analytical frameworks, and logic evaluation practice.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Start from</p>
        <div className="inline-flex rounded-xl border border-zinc-200 p-1" role="radiogroup" aria-label="Start from">
          {(
            [
              ["topic", "A topic"],
              ["mode", "A mode"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={startFrom === value}
              onClick={() => chooseStart(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                startFrom === value ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {startFrom === "topic"
            ? "Not sure what to practise? Get 10 concrete topics, each with a mode, or start from your own situation."
            : "You know which skill to train: pick a mode, then choose from AI topic ideas or the areas that fit it."}
        </p>
      </div>

      {startFrom === "topic" ? <TopicIdeasPanel /> : null}

      {startFrom === "mode" ? (
        <div className="space-y-4">
          <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Exercise mode">
            {PRACTICE_EXERCISE_CARDS.map((c) => (
              <button
                key={c.type}
                type="button"
                role="radio"
                aria-checked={pickedMode === c.type}
                onClick={() => setPickedMode(c.type as ThinkingType)}
                className={cn(
                  "rounded-xl border bg-white p-4 text-left transition-colors hover:bg-zinc-50/80",
                  pickedMode === c.type ? "border-zinc-900 ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300",
                )}
              >
                <p className="section-label mb-1 text-zinc-500">{c.label}</p>
                <p className="text-sm font-medium text-zinc-900">{c.title}</p>
                {c.desc ? <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{c.desc}</p> : null}
              </button>
            ))}
          </div>
          {pickedMode ? (
            <ModeTopicPanel key={pickedMode} mode={pickedMode} recentDomains={domainSuggestions} />
          ) : (
            <p className="text-muted-foreground text-sm">Pick a mode to see topic ideas.</p>
          )}
        </div>
      ) : null}
    </main>
  );
}
