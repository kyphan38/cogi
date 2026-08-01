"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import type { PracticedTopicArea } from "@/lib/types/practiced-topic";
import { listPracticedTitles } from "@/lib/db/practiced-topics";

export interface TopicSuggestion {
  title: string;
  blurb: string;
}

const MAX_MORE_CLICKS = 4;

interface UseTopicSuggestionsParams {
  area: PracticedTopicArea;
  kind: "exercise" | "math";
  /** Extra titles to exclude beyond already-practiced ones (e.g. Math's real catalog titles). */
  extraExcludeTitles?: string[];
  /** Only fetch once true - lets callers defer fetching until a tab/page is actually active. */
  enabled: boolean;
}

interface UseTopicSuggestionsResult {
  suggestions: TopicSuggestion[];
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
  moreDisabled: boolean;
  fetchMore: () => void;
  retry: () => void;
}

export function useTopicSuggestions(params: UseTopicSuggestionsParams): UseTopicSuggestionsResult {
  const { area, kind, extraExcludeTitles, enabled } = params;
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreClicks, setMoreClicks] = useState(0);

  const shownTitlesRef = useRef<string[]>([]);
  const practicedTitlesRef = useRef<string[]>([]);
  const startedRef = useRef(false);

  const fetchBatch = useCallback(
    async (isMore: boolean) => {
      if (isMore) setLoadingMore(true);
      else setLoadingInitial(true);
      setError(null);
      try {
        const excludeTitles = [
          ...practicedTitlesRef.current,
          ...(extraExcludeTitles ?? []),
          ...shownTitlesRef.current,
        ];
        const res = await aiFetch("/api/ai/topic-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area, kind, excludeTitles }),
        });
        const json = await safeAiJson<
          { ok: true; suggestions: TopicSuggestion[] } | { ok: false; error: string }
        >(res);
        if (!json.ok) {
          setError(json.error);
          return;
        }
        shownTitlesRef.current = [...shownTitlesRef.current, ...json.suggestions.map((s) => s.title)];
        setSuggestions(json.suggestions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load suggestions.");
      } finally {
        if (isMore) setLoadingMore(false);
        else setLoadingInitial(false);
      }
    },
    [area, kind, extraExcludeTitles],
  );

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
    void (async () => {
      try {
        practicedTitlesRef.current = await listPracticedTitles(area);
      } catch {
        practicedTitlesRef.current = [];
      }
      await fetchBatch(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const fetchMore = useCallback(() => {
    if (moreClicks >= MAX_MORE_CLICKS || loadingMore || loadingInitial) return;
    setMoreClicks((n) => n + 1);
    void fetchBatch(true);
  }, [moreClicks, loadingMore, loadingInitial, fetchBatch]);

  const retry = useCallback(() => {
    void fetchBatch(shownTitlesRef.current.length > 0);
  }, [fetchBatch]);

  return {
    suggestions,
    loadingInitial,
    loadingMore,
    error,
    moreDisabled: moreClicks >= MAX_MORE_CLICKS,
    fetchMore,
    retry,
  };
}
