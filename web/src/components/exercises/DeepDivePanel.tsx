"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalyticalDeepDive } from "@/lib/types/perspective";
import { stripVietnameseGlosses as clean } from "@/lib/ai/validators/deep-dive";

const LABELS = {
  issue: {
    core: "The core problem",
    examples: "Cases it ignores",
    fairer: "A fairer way to say it",
  },
  decoy: {
    core: "Why it looks weak",
    examples: "Why it holds up",
    fairer: "What would make it a real problem",
  },
} as const;

/**
 * "Go deeper" under one answer-key row. The first open asks the AI (the parent
 * saves the result); after that it only shows or hides what was saved.
 */
export function DeepDivePanel({
  kind,
  deepDive,
  onRequest,
}: {
  kind: "issue" | "decoy";
  deepDive?: AnalyticalDeepDive;
  onRequest: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!deepDive) {
      setError(null);
      setLoading(true);
      try {
        await onRequest();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the deeper analysis.");
        return;
      } finally {
        setLoading(false);
      }
    }
    setOpen(true);
  };

  const labels = LABELS[kind];
  const Icon = open ? ChevronUp : ChevronDown;

  return (
    <div className="space-y-2" data-testid="deep-dive">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2.5"
        aria-expanded={open}
        disabled={loading}
        onClick={() => void toggle()}
      >
        {loading ? "Thinking..." : open ? "Hide" : "Go deeper"}
        {loading ? null : <Icon aria-hidden data-icon="inline-end" />}
      </Button>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      {open && deepDive ? (
        <div className="border-muted space-y-3 border-l-2 pl-3" data-testid="deep-dive-body">
          <div className="space-y-1">
            <p className="text-foreground font-medium">{labels.core}</p>
            <p>{clean(deepDive.core)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-medium">{labels.examples}</p>
            <ul className="list-disc space-y-1 pl-5">
              {deepDive.examples.map((ex, i) => (
                <li key={i}>{clean(ex)}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-medium">{labels.fairer}</p>
            <p>{clean(deepDive.fairer)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
