"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { getUserContext } from "@/lib/db/settings";
import type { DomainSuggestion } from "@/lib/ai/domain-suggestions-parse";
import { EXERCISE_DOMAIN_CATALOG } from "@/lib/exercise/exercise-domain-catalog";
import { CALIBRATION_CATEGORIES } from "@/lib/exercise/calibration-bank";
import { TYPE_LABEL } from "@/lib/exercise/exercise-mode-cards";
import type { ThinkingType } from "@/lib/types/exercise";

const startHref = (mode: ThinkingType, domain: string) => `/exercise/${mode}?domain=${encodeURIComponent(domain)}`;

const chip =
  "rounded-full border border-zinc-200 px-3 py-1.5 text-sm hover:border-zinc-400 hover:bg-zinc-50";

/**
 * "Start from a mode": AI ideas (domain + sub-domain) for the picked mode, then the
 * catalog areas that fit it, which need no AI. Calibration asks only about its own
 * question bank, so it lists the bank topics instead.
 */
export function ModeTopicPanel({ mode, recentDomains }: { mode: ThinkingType; recentDomains: string[] }) {
  const [ideas, setIdeas] = useState<DomainSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = useRef<string[]>([]);
  const panelRef = useRef<HTMLElement>(null);
  const label = TYPE_LABEL[mode] ?? mode;

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userContext = await getUserContext().catch(() => "");
      const res = await aiFetch("/api/ai/domain-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, exclude: shown.current, recentDomains, userContext: userContext || undefined }),
      });
      const json = await safeAiJson<{ ok: true; suggestions: DomainSuggestion[] } | { ok: false; error: string }>(res);
      if (!json.ok) throw new Error(json.error);
      shown.current = [...shown.current, ...json.suggestions.map((s) => s.subdomain)];
      setIdeas(json.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not get ideas. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [mode, recentDomains]);

  useEffect(() => {
    // On a phone the panel sits below all the mode cards: bring it into view.
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    shown.current = [];
    setIdeas([]);
    if (mode !== "calibration") void fetchIdeas();
    // Only when the mode changes: a new mode starts a fresh list.
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mode === "calibration") {
    return (
      <section ref={panelRef} className="space-y-3 rounded-2xl border border-zinc-200 p-4" data-testid="mode-topic-panel">
        <h2 className="text-base font-medium">Topics for {label}</h2>
        <p className="text-muted-foreground text-sm">
          Calibration uses a checked question bank, so pick one of its topics. Base-rate problems come with every topic.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["Mixed", ...CALIBRATION_CATEGORIES] as const).map((t) => (
            <Link key={t} href={startHref(mode, t)} className={chip}>
              {t}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  const groups = EXERCISE_DOMAIN_CATALOG.filter((g) => g.bestFor?.includes(mode));
  return (
    <section ref={panelRef} className="space-y-4 rounded-2xl border border-zinc-200 p-4" data-testid="mode-topic-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">Topic ideas for {label}</h2>
        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void fetchIdeas()}>
          {loading ? <InlineSpinner /> : <RefreshCw className="size-3.5" aria-hidden />}
          {ideas.length > 0 ? "New ideas" : "Get ideas"}
        </Button>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {loading && ideas.length === 0 ? <p className="text-muted-foreground text-sm">Thinking of topics…</p> : null}
      {ideas.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="mode-topic-ideas">
          {ideas.map((s) => (
            <li key={s.subdomain}>
              <Link
                href={startHref(mode, s.subdomain)}
                className="block h-full rounded-xl border border-zinc-200 p-3 hover:border-zinc-400 hover:bg-zinc-50"
              >
                <span className="section-label text-zinc-500">{s.domain}</span>
                <span className="mt-0.5 block text-sm font-medium text-zinc-900">{s.subdomain}</span>
                <span className="text-muted-foreground mt-1 block text-xs">{s.why}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Or browse areas that fit {label}</h3>
        {groups.map((g) => (
          <details key={g.id} className="rounded-xl border border-zinc-200 px-3 py-2">
            <summary className="cursor-pointer text-sm">{g.label}</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.domains
                .filter((d) => d !== "Custom domain")
                .map((d) => (
                  <Link key={d} href={startHref(mode, d)} className={chip}>
                    {d}
                  </Link>
                ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
