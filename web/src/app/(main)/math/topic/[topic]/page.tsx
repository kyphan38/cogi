"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { listScenariosByTopic } from "@/lib/scenarios";
import type { Topic, Scenario } from "@/lib/types/math-scenario";
import { listPracticedTitleKeys, normalizeTitleKey } from "@/lib/db/practiced-topics";
import { saveDraftScenario } from "@/lib/scenarios/draft-session-cache";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { TopicSuggestionPicker, type SeedSuggestion } from "@/components/shared/TopicSuggestionPicker";
import { Badge } from "@/components/ui/badge";

const TOPIC_VALUES: Topic[] = [
  "expected_value",
  "graph_theory",
  "game_theory",
  "probability_bayes",
  "causal_literacy",
  "exponential_power_law",
];

const TOPIC_LABELS: Record<Topic, string> = {
  expected_value: "Expected Value",
  graph_theory: "Graph Theory",
  game_theory: "Game Theory",
  probability_bayes: "Probability & Bayes",
  causal_literacy: "Causal Literacy",
  exponential_power_law: "Exponential & Power Law",
};

function isTopic(value: string): value is Topic {
  return (TOPIC_VALUES as string[]).includes(value);
}

export default function MathTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicParam } = use(params);
  if (!isTopic(topicParam)) notFound();
  const topic = topicParam;
  const router = useRouter();

  const [practicedKeys, setPracticedKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listPracticedTitleKeys(topic).then((keys) => {
      if (!cancelled) setPracticedKeys(keys);
    });
    return () => {
      cancelled = true;
    };
  }, [topic]);

  const realScenarios = useMemo(() => listScenariosByTopic(topic), [topic]);

  const seedSuggestions: SeedSuggestion[] = useMemo(() => {
    if (!practicedKeys) return [];
    return realScenarios
      .filter((s) => !practicedKeys.has(normalizeTitleKey(s.title)))
      .map((s) => ({ title: s.title, blurb: s.situation.slice(0, 90) + "…", scenarioId: s.id }));
  }, [realScenarios, practicedKeys]);

  const handlePick = async (suggestion: { title: string; scenarioId?: string }) => {
    if (suggestion.scenarioId) {
      router.push(`/math/${suggestion.scenarioId}`);
      return;
    }
    const res = await aiFetch("/api/math/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "generate_scenario", topic, title: suggestion.title }),
    });
    const json = await safeAiJson<{ ok: true; scenario: Scenario } | { ok: false; error: string }>(res);
    if (!json.ok) {
      throw new Error(json.error);
    }
    saveDraftScenario(json.scenario);
    router.push(`/math/${json.scenario.id}`);
  };

  // Wait for the practiced-topic exclusion set before rendering the picker, so real
  // scenarios the user already completed aren't shown as if they were fresh options.
  if (practicedKeys === null) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <Link href="/math" className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors">
          ← Back to catalog
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl tracking-tight sm:text-[1.65rem]">{TOPIC_LABELS[topic]}</h1>
          {topic !== "expected_value" ? <Badge variant="attention">AI practice only</Badge> : null}
        </div>
        <p className="text-muted-foreground max-w-2xl text-sm">
          {topic === "expected_value"
            ? "Pick a scenario below. Verified scenarios are scored and count toward calibration; AI-drafted ones are unscored practice."
            : "This topic has no human-verified scenarios yet - every option below is an AI-drafted, unscored practice scenario."}
        </p>
      </div>

      <TopicSuggestionPicker area={topic} kind="math" seedSuggestions={seedSuggestions} onPick={handlePick} />
    </main>
  );
}
