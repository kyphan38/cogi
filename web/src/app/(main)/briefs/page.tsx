"use client";

import { useEffect, useState } from "react";

import { BriefView } from "@/components/briefs/BriefView";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section, WORD_LINK } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { BRIEF_AREAS, BRIEFS_PER_MONTH, briefsThisMonth, type Brief, type BriefArea, type BriefContent } from "@/lib/briefs/schema";
import { getBriefs, setBriefs } from "@/lib/db/briefs";
import { formatDay } from "@/lib/history";
import { localDay } from "@/lib/review/schedule";

type BriefReply = { ok: true; brief: BriefContent; sources: Brief["sources"] } | { ok: false; error: string };

/** Briefs: a short read on one big story of the last month, made on request. */
export default function BriefsPage() {
  const [briefs, setList] = useState<Brief[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [area, setArea] = useState<BriefArea>("World");
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBriefs()
      .then((rows) => {
        if (!cancelled) setList(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setList([]);
          setError("Could not load your briefs.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = localDay(new Date());
  const made = briefs ? briefsThisMonth(briefs, today) : 0;
  const left = Math.max(0, BRIEFS_PER_MONTH - made);
  const shown = briefs?.find((b) => b.id === openId) ?? briefs?.[0];

  const write = async () => {
    if (!briefs || writing || left === 0) return;
    setWriting(true);
    setError(null);
    try {
      const res = await aiFetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, today, avoid: briefs.map((b) => b.title) }),
      });
      const json = await safeAiJson<BriefReply>(res);
      if (!json.ok) throw new Error(json.error);
      const brief: Brief = { ...json.brief, id: crypto.randomUUID(), area, createdAt: new Date().toISOString(), sources: json.sources };
      setList(await setBriefs([brief, ...briefs]));
      setOpenId(brief.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write a brief.");
    } finally {
      setWriting(false);
    }
  };

  const answer = (check: number, option: number) => {
    if (!briefs || !shown) return;
    const answers = shown.checks.map((_, i) => (i === check ? option : (shown.answers?.[i] ?? null)));
    const next = briefs.map((b) => (b.id === shown.id ? { ...b, answers } : b));
    setList(next);
    void setBriefs(next).catch(() => setError("Your answer was not saved."));
  };

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader title="Briefs" sub="One big story of the last month, in five minutes." />

      <Section title="New brief">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-body" role="group" aria-label="Area">
            {BRIEF_AREAS.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={area === a}
                onClick={() => setArea(a)}
                className={area === a ? "font-medium text-foreground" : WORD_LINK.replace("text-meta", "text-body")}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button type="button" onClick={() => void write()} disabled={!briefs || writing || left === 0} data-testid="brief-new">
              {writing ? "Searching the news…" : "New brief"}
            </Button>
            <span className="text-meta text-muted-foreground tabular-nums" data-testid="brief-left">
              {left} of {BRIEFS_PER_MONTH} left this month
            </span>
          </div>
          {error ? (
            <p className="text-meta font-medium text-foreground" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Section>

      {briefs && briefs.length > 1 ? (
        <Section title="Your briefs">
          <ul className="border-b border-border" data-testid="brief-list">
            {briefs.map((b) => (
              <li key={b.id} className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setOpenId(b.id)}
                  aria-current={shown?.id === b.id ? "true" : undefined}
                  className="flex w-full items-baseline justify-between gap-4 py-2.5 text-left"
                >
                  <span className={shown?.id === b.id ? "min-w-0 truncate text-body font-medium" : "min-w-0 truncate text-body text-muted-foreground"}>{b.title}</span>
                  <span className="shrink-0 text-meta text-muted-foreground">{formatDay(b.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {shown ? <BriefView key={shown.id} brief={shown} onAnswer={answer} /> : null}
    </main>
  );
}
