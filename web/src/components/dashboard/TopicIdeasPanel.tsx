"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { requestTopicIdeas } from "@/lib/topics/client";
import {
  AI_TOPIC_MODES,
  calibrationIdeas,
  groupsForMode,
  TOPIC_GROUPS,
  topicGroupById,
  type AiTopicMode,
  type TopicIdea,
} from "@/lib/topics/topic-ideas";
import {
  handoffFor,
  OWN_TEXT_MIN_WORDS,
  saveScenarioHandoff,
  SCENARIO_MODES,
  wordCount,
  type ScenarioMode,
} from "@/lib/topics/scenario-handoff";
import type { ThinkingType } from "@/lib/types/exercise";

type ModeFilter = AiTopicMode | "calibration" | "all";
type Recommendation = { mode: string; reason: string };

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-zinc-400";

/** Up to this many modes are suggested for a scenario. */
const SUGGESTED_MODES = 3;

const topicHref = (idea: TopicIdea) => `/exercise/${idea.mode}?domain=${encodeURIComponent(idea.mode === "calibration" ? idea.domain : idea.title)}`;

/**
 * Topic ideas (PLAN-topic-ideas.md): filters, a Generate button, and a list of 10
 * concrete topics. A row opens the setup of its mode with the topic filled in. With
 * "Specific scenario", the learner's own text goes straight to a fitting mode.
 * `fixedMode` is set on "A mode": the mode filter is hidden and rows show no mode.
 */
export function TopicIdeasPanel({ fixedMode }: { fixedMode?: ThinkingType }) {
  const router = useRouter();
  const [input, setInput] = useState<"domain" | "scenario">("domain");
  const [modeFilter, setModeFilter] = useState<ModeFilter>((fixedMode as ModeFilter) ?? "all");
  const [groupId, setGroupId] = useState("");
  const [domain, setDomain] = useState("");
  const [ideas, setIdeas] = useState<TopicIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState("");
  const [recs, setRecs] = useState<Recommendation[] | null>(null);

  const mode = fixedMode ? (fixedMode as ModeFilter) : modeFilter;
  const isCalibration = mode === "calibration";
  const groups = mode === "all" || isCalibration ? TOPIC_GROUPS : groupsForMode(mode as AiTopicMode);
  const group = topicGroupById(groupId);
  const scenarioAllowed = !fixedMode || (SCENARIO_MODES as readonly string[]).includes(fixedMode);

  const resetList = () => {
    setIdeas(null);
    setError(null);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await requestTopicIdeas(
        { mode: mode as AiTopicMode | "all", groupId: groupId || undefined, domain: domain || undefined },
        (ideas ?? []).map((i) => i.title),
      );
      setIdeas(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get topic ideas.");
    } finally {
      setLoading(false);
    }
  };

  const startScenario = (m: ScenarioMode) => {
    saveScenarioHandoff(handoffFor(m, scenario));
    router.push(`/exercise/${m}?source=${handoffFor(m, scenario).source}`);
  };

  const suggestModes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiFetch("/api/ai/recommend-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: scenario.trim().slice(0, 1200) }),
      });
      const json = await safeAiJson<{ ok: boolean; recommendations?: Recommendation[]; error?: string }>(res);
      if (!json.ok || !json.recommendations) throw new Error(json.error || "Could not suggest modes.");
      setRecs(json.recommendations.filter((r) => (SCENARIO_MODES as readonly string[]).includes(r.mode)).slice(0, SUGGESTED_MODES));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not suggest modes.");
    } finally {
      setLoading(false);
    }
  };

  const scenarioReady = scenario.trim().length >= 40;
  const words = wordCount(scenario);

  return (
    <div className="space-y-4" data-testid="topic-ideas">
      {scenarioAllowed ? (
        <div className="inline-flex rounded-xl border border-zinc-200 p-1" role="radiogroup" aria-label="Start with">
          {(
            [
              ["domain", "Domain"],
              ["scenario", "Specific scenario"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={input === value}
              onClick={() => {
                setInput(value);
                setError(null);
              }}
              className={cn("rounded-lg px-3 py-1.5 text-sm", input === value ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50")}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {input === "domain" ? (
        <>
          <div className={cn("grid gap-2", fixedMode ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_1fr_auto]", "sm:items-end")}>
            {!isCalibration ? (
              <>
                <label className="grid min-w-0 gap-1 text-sm">
                  <span className="font-medium">Area</span>
                  <select
                    className={selectClass}
                    value={groupId}
                    onChange={(e) => {
                      setGroupId(e.target.value);
                      setDomain("");
                      resetList();
                    }}
                    data-testid="topic-group"
                  >
                    <option value="">Any area</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid min-w-0 gap-1 text-sm">
                  <span className="font-medium">Domain</span>
                  <select
                    className={selectClass}
                    value={domain}
                    disabled={!group}
                    onChange={(e) => {
                      setDomain(e.target.value);
                      resetList();
                    }}
                    data-testid="topic-domain"
                  >
                    <option value="">{group ? "Any domain" : "Pick an area first"}</option>
                    {group?.domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            {!fixedMode ? (
              <label className="grid min-w-0 gap-1 text-sm">
                <span className="font-medium">Mode</span>
                <select
                  className={selectClass}
                  value={modeFilter}
                  onChange={(e) => {
                    const next = e.target.value as ModeFilter;
                    setModeFilter(next);
                    if (next !== "all" && next !== "calibration" && group && !group.modes.includes(next)) {
                      setGroupId("");
                      setDomain("");
                    }
                    resetList();
                  }}
                  data-testid="topic-mode"
                >
                  <option value="all">All modes</option>
                  {[...AI_TOPIC_MODES, "calibration" as const].map((m) => (
                    <option key={m} value={m}>
                      {TYPE_LABEL[m]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {!isCalibration ? (
              <Button type="button" disabled={loading} onClick={() => void generate()} data-testid="topic-generate">
                {loading ? (
                  <>
                    <InlineSpinner /> Generating...
                  </>
                ) : ideas ? (
                  "Generate new topics"
                ) : (
                  "Generate topics"
                )}
              </Button>
            ) : null}
          </div>

          {isCalibration ? (
            <TopicList ideas={calibrationIdeas()} showMode={false} note="Calibration uses its own question bank. Pick a topic:" />
          ) : loading && !ideas ? (
            <p className="text-muted-foreground text-sm">Finding 10 topics for you. This takes about 15 seconds.</p>
          ) : ideas ? (
            <div className={cn(loading && "opacity-60")}>
              <TopicList ideas={ideas} showMode={!fixedMode} />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Choose filters if you like, then press Generate. Leave them on &quot;Any&quot; for a mix.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Your situation or text</span>
            <Textarea
              rows={5}
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value);
                setRecs(null);
              }}
              placeholder="Describe a situation in a few sentences, or paste an article, email or plan."
              data-testid="topic-scenario"
            />
            <span className="text-muted-foreground text-xs">
              {words} words. {OWN_TEXT_MIN_WORDS}+ words: Analytical reads your text as it is. Shorter: the AI builds an exercise around it.
            </span>
          </label>
          {fixedMode ? (
            <Button type="button" disabled={!scenarioReady} onClick={() => startScenario(fixedMode as ScenarioMode)} data-testid="scenario-start">
              Start with my situation
            </Button>
          ) : (
            <Button type="button" disabled={!scenarioReady || loading} onClick={() => void suggestModes()} data-testid="scenario-suggest">
              {loading ? (
                <>
                  <InlineSpinner /> Finding modes...
                </>
              ) : (
                "Suggest modes"
              )}
            </Button>
          )}
          {recs ? (
            <ul className="space-y-2" data-testid="scenario-modes">
              {recs.map((r) => (
                <li key={r.mode}>
                  <button
                    type="button"
                    onClick={() => startScenario(r.mode as ScenarioMode)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{TYPE_LABEL[r.mode] ?? r.mode}</span>
                      <span className="text-muted-foreground block text-xs">{r.reason}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-700" role="alert" data-testid="topic-error">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void (input === "domain" ? generate() : suggestModes())}>
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}

function TopicList({ ideas, showMode, note }: { ideas: TopicIdea[]; showMode: boolean; note?: string }) {
  return (
    <div className="space-y-2">
      {note ? <p className="text-muted-foreground text-sm">{note}</p> : null}
      <ol className="space-y-2" data-testid="topic-list">
        {ideas.map((idea, i) => (
          <li key={`${idea.mode}-${idea.title}`}>
            <Link
              href={topicHref(idea)}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm hover:bg-zinc-50"
              data-testid="topic-row"
            >
              <span className="text-muted-foreground w-5 shrink-0 text-right tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-zinc-900">{idea.title}</span>
                <span className="text-muted-foreground block text-xs">
                  {showMode ? `${TYPE_LABEL[idea.mode] ?? idea.mode} · ` : ""}
                  {idea.domain}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-zinc-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
