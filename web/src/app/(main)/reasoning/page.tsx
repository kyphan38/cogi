"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { useToast } from "@/components/ui/toast";
import { ExercisePickerCard } from "@/components/dashboard/ExercisePickerCard";
import { DomainInput } from "@/components/shared/DomainInput";
import { listRecentDomains } from "@/lib/db/exercises";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { PRACTICE_EXERCISE_CARDS } from "@/lib/exercise/exercise-mode-cards";
import { ModeTopicPanel } from "@/components/dashboard/ModeTopicPanel";
import { cn } from "@/lib/utils";
import type { ThinkingType } from "@/lib/types/exercise";

type ModeRecommendation = { mode: string; reason: string };

/** SessionStorage key for passing source text from Reasoning → exercise flow. */
const HOME_SOURCE_TEXT_KEY = "cogi:home-source-text";
/** Remembers "start from a topic / a mode" on this device. */
const START_FROM_KEY = "cogi:practice-start-from";
/** How many ranked modes show their reason. */
const REASONS_SHOWN = 3;

type StartFrom = "topic" | "mode";

export default function ReasoningPage() {
  const { show: showToast } = useToast();
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState<"generated" | "real_data" | "custom_scenario">("generated");
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [realDataText, setRealDataText] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<ModeRecommendation[] | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [startFrom, setStartFrom] = useState<StartFrom>("topic");
  const [pickedMode, setPickedMode] = useState<ThinkingType | null>(null);

  useEffect(() => {
    try {
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

  const recMap = useMemo(() => {
    if (!recommendations) return null;
    const map = new Map<string, string>();
    for (const r of recommendations) map.set(r.mode, r.reason);
    return map;
  }, [recommendations]);

  const orderedCards = useMemo(() => {
    if (!recMap) return PRACTICE_EXERCISE_CARDS;
    return [...PRACTICE_EXERCISE_CARDS].sort((a, b) => {
      const idxA = recommendations!.findIndex((r) => r.mode === a.type);
      const idxB = recommendations!.findIndex((r) => r.mode === b.type);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
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
      } else {
        throw new Error("No recommendations came back. Showing the default order.");
      }
    } catch (error) {
      // Keep the default card order, but never fail silently: a swallowed error
      // here made a broken Firestore rule look like a dead button.
      const message =
        error instanceof Error ? error.message : "Could not rank the modes. Please try again.";
      console.error("[recommend-mode]", error);
      showToast(message, "error");
    } finally {
      setRecLoading(false);
    }
  }, [topic, showToast]);

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
            ? "You know what to practise on: pick a domain, then let AI rank the modes for it."
            : "You know which skill to train: pick a mode, then choose from AI topic ideas or the areas that fit it."}
        </p>
      </div>

      {startFrom === "topic" ? (
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
            <Label className="mb-1.5 block text-sm font-medium" htmlFor="reasoning-custom-scenario">
              Describe your situation - AI will design the exercise around it
            </Label>
            <Textarea
              id="reasoning-custom-scenario"
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
            <Label className="mb-1.5 block text-sm font-medium" htmlFor="reasoning-real-data">
              Paste your own content (up to 2,000 words)
            </Label>
            <Textarea
              id="reasoning-real-data"
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
            Recommended order for <span className="font-medium text-zinc-700">{topic.trim()}</span> - pick any mode, or{" "}
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

      ) : null}

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
      ) : (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {orderedCards.map((c, i) => {
          const isTopRec = recMap !== null && i === 0;
          const domainParam = topic.trim() ? `?domain=${encodeURIComponent(topic.trim())}` : "";
          const sourceParam = domainParam && source !== "generated" ? `&source=${source}` : "";
          const autoParam = isTopRec && domainParam ? "&autoGenerate=1" : "";
          const href = `${c.href}${domainParam}${sourceParam}${autoParam}`;
          const needsSessionData = isTopRec && domainParam && source !== "generated";
          return (
            <ExercisePickerCard
              key={c.type}
              href={href}
              label={c.label}
              title={c.title}
              desc={c.desc}
              recommended={isTopRec}
              reason={recMap !== null && i < REASONS_SHOWN ? recMap.get(c.type) : undefined}
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
      )}
    </main>
  );
}
