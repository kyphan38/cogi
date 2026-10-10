"use client";

import { useEffect, useRef, useState } from "react";

import { PRACTICE_EXERCISE_CARDS } from "@/lib/exercise/exercise-mode-cards";
import { TopicIdeasPanel } from "@/components/dashboard/TopicIdeasPanel";
import { readSessionState, writeSessionState } from "@/lib/session-state";
import { cn } from "@/lib/utils";
import type { ThinkingType } from "@/lib/types/exercise";

/** Remembers "start from a topic / a mode" on this device. */
const START_FROM_KEY = "cogi:practice-start-from";
/** The mode picked under "A mode", kept for this tab so Back returns to it. */
const PICKED_MODE_KEY = "cogi:practice-picked-mode";

type StartFrom = "topic" | "mode";

/**
 * New exercise. "A topic": filters, Generate, and 10 concrete topics, each with its mode,
 * or your own scenario (PLAN-topic-ideas.md T2). "A mode": pick the skill first, then the
 * same filters and Generate, without the mode filter (T3).
 */
export default function ReasoningPage() {
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
    const m = readSessionState<ThinkingType>(PICKED_MODE_KEY);
    if (m && PRACTICE_EXERCISE_CARDS.some((c) => c.type === m)) setPickedMode(m);
  }, []);

  const chooseStart = (next: StartFrom) => {
    setStartFrom(next);
    try {
      localStorage.setItem(START_FROM_KEY, next);
    } catch {
      // Only a convenience.
    }
  };

  const panelRef = useRef<HTMLDivElement>(null);
  const pickMode = (m: ThinkingType) => {
    setPickedMode(m);
    writeSessionState(PICKED_MODE_KEY, m);
    // On a phone the panel sits below all the mode cards: bring it into view.
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">New exercise</h1>
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
            : "You know which skill to train: pick a mode, then generate 10 topics for it or use your own situation."}
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
                onClick={() => pickMode(c.type as ThinkingType)}
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
          <div ref={panelRef} className="scroll-mt-20" data-testid="mode-panel">
            {pickedMode ? (
              <TopicIdeasPanel key={pickedMode} fixedMode={pickedMode} />
            ) : (
              <p className="text-muted-foreground text-sm">Pick a mode, then generate topics for it.</p>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
