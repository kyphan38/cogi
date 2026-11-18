"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Section } from "@/components/shared/Section";
import { cn } from "@/lib/utils";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { PRACTICE_EXERCISE_TYPES, TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import { getSavedTopics, setSavedTopics } from "@/lib/db/saved-topics";
import { readSessionState, writeSessionState } from "@/lib/session-state";
import { requestTopicIdeas } from "@/lib/topics/client";
import { savedTopicKey, toggleSavedTopic, type SavedTopic } from "@/lib/topics/saved-topics";
import {
  calibrationIdeas,
  trickyIdeas,
  humorIdeas,
  groupsForMode,
  TOPIC_GROUPS,
  topicGroupById,
  type AiTopicMode,
  type TopicIdea,
} from "@/lib/topics/topic-ideas";
import { handoffFor, saveScenarioHandoff, SCENARIO_MODES, type ScenarioMode } from "@/lib/topics/scenario-handoff";
import type { ThinkingType } from "@/lib/types/exercise";

type Recommendation = { mode: string; reason: string };

/** Rows shown before "more". */
const FIRST_ROWS = 5;
/** Own text shorter than this is too thin to build an exercise on. */
const MIN_OWN_TEXT = 10;
const STATE_KEY = "cogi:new-exercise";

/** What the page shows, kept for this tab so Back restores it. */
interface PageState {
  text: string;
  mode: ThinkingType | null;
  groupId: string;
  domain: string;
  ideas: TopicIdea[] | null;
}

const topicHref = (idea: TopicIdea) =>
  `/exercise/${idea.mode}?domain=${encodeURIComponent(idea.mode === "calibration" || idea.mode === "tricky" || idea.mode === "humor" ? idea.domain : idea.title)}`;

const isScenarioMode = (m: string | null): m is ScenarioMode =>
  m != null && (SCENARIO_MODES as readonly string[]).includes(m);

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2.5 text-body text-foreground focus-visible:outline-2 focus-visible:outline-ring";

const WORD = "text-body text-muted-foreground transition-colors hover:text-foreground active:text-foreground";

/**
 * New exercise on one screen (PLAN-refine R6): type what you want to think
 * about and press Start (the AI picks the mode unless you chose one), or pick
 * a suggested topic. Mode, area and domain sit behind "change".
 */
export function NewExercise() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ThinkingType | null>(null);
  const [groupId, setGroupId] = useState("");
  const [domain, setDomain] = useState("");
  const [ideas, setIdeas] = useState<TopicIdea[] | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [saved, setSaved] = useState<SavedTopic[]>([]);
  // False until the saved state is applied, so the first render's defaults never overwrite it.
  const [ready, setReady] = useState(false);
  // The first-visit load runs once, also when dev Strict Mode mounts twice.
  const firstLoad = useRef(false);

  // Calibration, Tricky questions and Light replies list fixed starters, not AI topics.
  const isCalibration = mode === "calibration" || mode === "tricky" || mode === "humor";
  const groups = mode && !isCalibration ? groupsForMode(mode as AiTopicMode) : TOPIC_GROUPS;
  const group = topicGroupById(groupId);

  const loadIdeas = async (keep: TopicIdea[] = []) => {
    setLoadingIdeas(true);
    setError(null);
    try {
      const next = await requestTopicIdeas(
        { mode: (mode ?? "all") as AiTopicMode | "all", groupId: groupId || undefined, domain: domain || undefined },
        keep.map((i) => i.title),
      );
      setIdeas(next);
      setShowAll(false);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "Could not get topics.", retry: () => void loadIdeas(keep) });
    } finally {
      setLoadingIdeas(false);
    }
  };

  // Restore this tab's page after mount (the server has no sessionStorage).
  // A first visit loads topics once, so there is always something to pick.
  useEffect(() => {
    const s = readSessionState<PageState>(STATE_KEY);
    if (s) {
      setText(s.text);
      setMode(s.mode);
      setGroupId(s.groupId);
      setDomain(s.domain);
      setIdeas(s.ideas);
    }
    setReady(true);
    if (!s && !firstLoad.current) {
      firstLoad.current = true;
      void loadIdeas();
    }
    void getSavedTopics()
      .then(setSaved)
      .catch(() => setSaved([]));
    // Runs once on mount; loadIdeas reads the defaults then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    writeSessionState(STATE_KEY, { text, mode, groupId, domain, ideas } satisfies PageState);
  }, [ready, text, mode, groupId, domain, ideas]);

  /** A filter changed: the old list no longer fits. */
  const resetIdeas = () => {
    setIdeas(null);
    setError(null);
  };

  const chooseMode = (next: ThinkingType | null) => {
    setMode(next);
    if (next && next !== "calibration" && next !== "tricky" && next !== "humor" && group && !group.modes.includes(next)) {
      setGroupId("");
      setDomain("");
    }
    resetIdeas();
  };

  const goWithText = (m: ScenarioMode) => {
    const h = handoffFor(m, text);
    saveScenarioHandoff(h);
    router.push(`/exercise/${m}?source=${h.source}`);
  };

  const start = async () => {
    if (isScenarioMode(mode)) return goWithText(mode);
    setStarting(true);
    setError(null);
    try {
      const res = await aiFetch("/api/ai/recommend-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: text.trim().slice(0, 1200) }),
      });
      const json = await safeAiJson<{ ok: boolean; recommendations?: Recommendation[]; error?: string }>(res);
      const best = json.recommendations?.map((r) => r.mode).find(isScenarioMode);
      if (!json.ok || !best) throw new Error(json.error || "Could not pick a mode.");
      goWithText(best);
    } catch (e) {
      setStarting(false);
      setError({ message: e instanceof Error ? e.message : "Could not pick a mode.", retry: () => void start() });
    }
  };

  const toggleSaved = (idea: TopicIdea) => {
    const prev = saved;
    const next = toggleSavedTopic(prev, idea);
    setSaved(next);
    setSavedTopics(next).catch(() => {
      setSaved(prev);
      setError({ message: "Could not save the topic. Check your connection.", retry: () => toggleSaved(idea) });
    });
  };
  const savedKeys = new Set(saved.map(savedTopicKey));
  const savedHere = mode ? saved.filter((t) => t.mode === mode) : saved;

  const textReady = text.trim().length >= MIN_OWN_TEXT;
  const textMode = mode == null || isScenarioMode(mode);
  const listed = mode === "tricky" ? trickyIdeas() : mode === "humor" ? humorIdeas() : isCalibration ? calibrationIdeas() : ideas;
  const shown = listed && !showAll ? listed.slice(0, FIRST_ROWS) : listed;

  return (
    <div className="flex flex-col gap-12">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (textReady && textMode && !starting) void start();
        }}
      >
        <label htmlFor="own-topic" className="mb-2.5 block text-body font-medium">
          What do you want to think about?
        </label>
        <div className="rounded-[10px] border border-input bg-card px-4 pt-3.5 pb-3 focus-within:border-foreground/40">
          <textarea
            id="own-topic"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="A decision, a claim, a news story… or paste a whole article."
            className="w-full resize-none bg-transparent text-body leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
            data-testid="own-topic"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-meta text-muted-foreground">
              Mode: {mode ? TYPE_LABEL[mode] : "picked for you"} ·{" "}
              <button
                type="button"
                className="font-medium text-foreground"
                aria-expanded={showOptions}
                onClick={() => setShowOptions((v) => !v)}
                data-testid="options-toggle"
              >
                {showOptions ? "done" : "change"}
              </button>
            </p>
            <Button type="submit" disabled={!textReady || !textMode || starting} data-testid="own-start">
              {starting ? "Finding a mode…" : "Start"}
            </Button>
          </div>
        </div>
        {!textMode ? (
          <p className="mt-2 text-meta text-muted-foreground">{TYPE_LABEL[mode!]} starts from a topic below.</p>
        ) : null}

        {showOptions ? (
          <div className="mt-5 space-y-4" data-testid="options">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-body" role="radiogroup" aria-label="Exercise mode">
              {[null, ...PRACTICE_EXERCISE_TYPES].map((m) => (
                <button
                  key={m ?? "auto"}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => chooseMode(m as ThinkingType | null)}
                  className={cn("py-1", mode === m ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {m ? TYPE_LABEL[m] : "Picked for you"}
                </button>
              ))}
            </div>
            {!isCalibration ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 text-body">
                  <span className="font-medium">Area</span>
                  <select
                    className={selectClass}
                    value={groupId}
                    onChange={(e) => {
                      setGroupId(e.target.value);
                      setDomain("");
                      resetIdeas();
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
                <label className="grid min-w-0 gap-1 text-body">
                  <span className="font-medium">Domain</span>
                  <select
                    className={selectClass}
                    value={domain}
                    disabled={!group}
                    onChange={(e) => {
                      setDomain(e.target.value);
                      resetIdeas();
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
              </div>
            ) : null}
          </div>
        ) : null}
      </form>

      <Section
        title="Or pick one"
        action={
          isCalibration ? null : (
            <button
              type="button"
              className={WORD}
              disabled={loadingIdeas}
              onClick={() => void loadIdeas(ideas ?? [])}
              data-testid="topic-generate"
            >
              {ideas ? "new set" : "get topics"}
            </button>
          )
        }
      >
        {loadingIdeas && !ideas ? (
          <p className="text-body text-muted-foreground breathe" data-testid="topics-loading">
            Finding topics…
          </p>
        ) : shown ? (
          <div className={cn(loadingIdeas && "opacity-60")}>
            <TopicRows ideas={shown} showMode={!mode} savedKeys={isCalibration ? undefined : savedKeys} onToggleSave={toggleSaved} />
            {listed && listed.length > FIRST_ROWS ? (
              <button type="button" className={cn(WORD, "mt-3")} onClick={() => setShowAll((v) => !v)} data-testid="topic-more">
                {showAll ? "fewer" : `${listed.length - FIRST_ROWS} more`}
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-meta text-muted-foreground">Press &quot;get topics&quot; for ideas that fit.</p>
        )}
      </Section>

      {!isCalibration && savedHere.length > 0 ? (
        <Section title="Saved topics" data-testid="saved-topics">
          <TopicRows ideas={savedHere} showMode={!mode} savedKeys={savedKeys} onToggleSave={toggleSaved} testId="saved-topic-list" />
        </Section>
      ) : null}

      {error ? (
        <p className="text-body font-medium text-foreground" role="alert" data-testid="topic-error">
          {error.message}{" "}
          <button type="button" className="font-semibold" onClick={error.retry}>
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}

/** Plain rows: title, mode and domain; "Use" and the bookmark wait for the pointer. */
function TopicRows({
  ideas,
  showMode,
  savedKeys,
  onToggleSave,
  testId = "topic-list",
}: {
  ideas: TopicIdea[];
  showMode: boolean;
  savedKeys?: Set<string>;
  onToggleSave: (idea: TopicIdea) => void;
  testId?: string;
}) {
  return (
    <ol className="border-b border-border" data-testid={testId}>
      {ideas.map((idea) => {
        const isSaved = savedKeys?.has(savedTopicKey(idea)) ?? false;
        return (
          <li key={`${idea.mode}-${idea.title}`} className="group/item flex min-w-0 items-center gap-2 border-t border-border">
            <Link href={topicHref(idea)} className="group/row flex min-w-0 flex-1 items-center justify-between gap-4 py-3" data-testid="topic-row">
              <span className="min-w-0">
                <span className="block text-body">{idea.title}</span>
                <span className="block text-meta text-muted-foreground">
                  {showMode ? `${TYPE_LABEL[idea.mode] ?? idea.mode} · ` : ""}
                  {idea.domain}
                </span>
              </span>
              {/* Phones: the whole row is the tap target, so the word gives way to the title. */}
              <span className="hidden shrink-0 text-body font-medium text-foreground opacity-0 transition-opacity after:ml-1 after:content-['›'] group-hover/row:opacity-100 group-focus-visible/row:opacity-100 sm:inline">
                Use
              </span>
            </Link>
            {savedKeys ? (
              <button
                type="button"
                onClick={() => onToggleSave(idea)}
                aria-label={isSaved ? `Remove "${idea.title}" from saved topics` : `Save "${idea.title}"`}
                aria-pressed={isSaved}
                title={isSaved ? "Saved" : "Save for later"}
                className={cn(
                  "shrink-0 rounded p-1.5 text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100",
                  isSaved ? "opacity-100" : "opacity-0 group-hover/item:opacity-100 [@media(hover:none)]:opacity-60",
                )}
                data-testid="topic-save"
              >
                {isSaved ? <BookmarkCheck className="size-4 text-foreground" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
