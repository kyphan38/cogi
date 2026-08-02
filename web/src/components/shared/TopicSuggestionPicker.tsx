"use client";

import { useState } from "react";
import { useTopicSuggestions } from "@/lib/hooks/useTopicSuggestions";
import type { PracticedTopicArea } from "@/lib/types/practiced-topic";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { cn } from "@/lib/utils";

export interface SeedSuggestion {
  title: string;
  blurb?: string;
  scenarioId?: string;
  badge?: string;
}

interface TopicSuggestionPickerProps {
  area: PracticedTopicArea;
  kind: "exercise" | "math";
  /** Non-AI options shown before the AI-generated ones (e.g. Math's real, verified scenarios). */
  seedSuggestions?: SeedSuggestion[];
  onPick: (suggestion: { title: string; scenarioId?: string }) => void | Promise<void>;
}

export function TopicSuggestionPicker({ area, kind, seedSuggestions, onPick }: TopicSuggestionPickerProps) {
  const [pickingTitle, setPickingTitle] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const { suggestions, loadingInitial, loadingMore, error, moreDisabled, fetchMore, retry, regenerate } =
    useTopicSuggestions({
      area,
      kind,
      extraExcludeTitles: seedSuggestions?.map((s) => s.title),
      enabled: true,
    });

  const handlePick = async (suggestion: { title: string; scenarioId?: string }) => {
    if (pickingTitle) return;
    setPickingTitle(suggestion.title);
    setPickError(null);
    try {
      await onPick(suggestion);
    } catch (e) {
      setPickError(e instanceof Error ? e.message : "Could not start this topic. Try another.");
    } finally {
      setPickingTitle(null);
    }
  };

  const disabled = pickingTitle !== null;

  return (
    <div className="space-y-3">
      {pickError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not start this topic</AlertTitle>
          <AlertDescription>{pickError}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load suggestions</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" size="sm" variant="secondary" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loadingInitial ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(seedSuggestions ?? []).map((s) => (
            <button
              key={`seed-${s.title}`}
              type="button"
              disabled={disabled}
              onClick={() => void handlePick({ title: s.title, scenarioId: s.scenarioId })}
              className="text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Card className={cn("h-full gap-2 transition-colors hover:border-zinc-300", pickingTitle === s.title && "border-zinc-400")}>
                <CardContent className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="positive">{s.badge ?? "Verified scenario"}</Badge>
                    {pickingTitle === s.title ? <InlineSpinner /> : null}
                  </div>
                  <p className="text-sm font-medium">{s.title}</p>
                  {s.blurb ? <p className="text-muted-foreground text-xs">{s.blurb}</p> : null}
                </CardContent>
              </Card>
            </button>
          ))}

          {suggestions.map((s) => (
            <button
              key={s.title}
              type="button"
              disabled={disabled}
              onClick={() => void handlePick({ title: s.title })}
              className="text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Card className={cn("h-full gap-2 transition-colors hover:border-zinc-300", pickingTitle === s.title && "border-zinc-400")}>
                <CardContent className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    {kind === "math" ? <Badge variant="attention">AI draft, unverified</Badge> : <Badge variant="secondary">AI suggested</Badge>}
                    {pickingTitle === s.title ? (
                      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <InlineSpinner /> {kind === "math" ? "Generating scenario…" : "Starting…"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-muted-foreground text-xs">{s.blurb}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {!loadingInitial && !error && suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {moreDisabled ? (
            <p className="text-muted-foreground text-center text-xs italic">
              That&apos;s all for now - check back later for more suggestions.
            </p>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={disabled || loadingMore} onClick={fetchMore}>
              {loadingMore ? (
                <>
                  <InlineSpinner /> Loading more…
                </>
              ) : (
                "More"
              )}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" disabled={disabled || loadingMore} onClick={regenerate}>
            New suggestions
          </Button>
        </div>
      ) : null}
    </div>
  );
}
