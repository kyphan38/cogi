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
import { ALL_EXERCISE_CARDS } from "@/lib/exercise/exercise-mode-cards";

type ModeRecommendation = { mode: string; reason: string };

/** SessionStorage key for passing source text from Reasoning → exercise flow. */
const HOME_SOURCE_TEXT_KEY = "cogi:home-source-text";

export default function ReasoningPage() {
  const { show: showToast } = useToast();
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState<"generated" | "real_data" | "custom_scenario">("generated");
  const [customScenarioText, setCustomScenarioText] = useState("");
  const [realDataText, setRealDataText] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<ModeRecommendation[] | null>(null);
  const [recLoading, setRecLoading] = useState(false);

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
        <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">Reasoning</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Applied critical thinking, analytical frameworks, and logic evaluation practice.
        </p>
      </div>

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
    </main>
  );
}
