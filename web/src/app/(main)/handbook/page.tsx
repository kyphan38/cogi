"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_LABELS, PRACTICE_LEVELS } from "@/lib/exercise/levels";
import { HANDBOOK_ENTRIES, HANDBOOK_GROUPS, HANDBOOK_START, type HandbookEntry } from "@/lib/handbook/content";
import { PageHeader } from "@/components/shared/PageHeader";
import { HANDBOOK_SHORTCUTS } from "@/lib/handbook/shortcuts";

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function EntryBody({ entry }: { entry: HandbookEntry }) {
  return (
    <div className="fade-in space-y-4 px-4 pb-4 text-body leading-relaxed" data-testid="handbook-entry-body">
      <section className="space-y-1">
        <h3 className="text-foreground font-medium">What you get</h3>
        <List items={entry.benefits} />
      </section>
      <section className="space-y-1">
        <h3 className="text-foreground font-medium">How to practise</h3>
        <List items={entry.howToPractice} />
      </section>
      {entry.levels ? (
        <section className="space-y-1">
          <h3 className="text-foreground font-medium">Levels</h3>
          <dl className="space-y-1">
            {PRACTICE_LEVELS.map((l) => (
              <div key={l} className="grid gap-0.5 sm:grid-cols-[5.5rem_1fr]">
                <dt className="text-foreground">{LEVEL_LABELS[l]}</dt>
                <dd className="text-muted-foreground">{entry.levels![l]}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <section className="space-y-1">
        <h3 className="text-foreground font-medium">Tips</h3>
        <List items={entry.tips} />
      </section>
      <Link href={entry.href} className="inline-block text-meta text-muted-foreground hover:text-foreground after:ml-1 after:content-['›']">
        Open
      </Link>
    </div>
  );
}

/** One entry: title and the "trains" line always show; the rest opens on a tap. */
function EntryRow({ entry, open, onToggle }: { entry: HandbookEntry; open: boolean; onToggle: () => void }) {
  return (
    <div id={entry.id} className="scroll-mt-16 border-t border-border" data-testid="handbook-entry">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group/entry flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-body font-medium text-foreground">{entry.title}</span>
          <span className="block text-body text-muted-foreground">{entry.trains}</span>
        </span>
        <span className="shrink-0 pt-0.5 text-meta text-muted-foreground group-hover/entry:text-foreground">
          {open ? "close" : "open"}
        </span>
      </button>
      {open ? <EntryBody entry={entry} /> : null}
    </div>
  );
}

function hashId(): string | null {
  const id = window.location.hash.slice(1);
  return HANDBOOK_ENTRIES.some((e) => e.id === id) ? id : null;
}

/** Handbook: what each feature trains, what you get, and how to practise. */
export default function HandbookPage() {
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());

  // A link to /handbook#strategy opens that entry.
  useEffect(() => {
    const openFromHash = () => {
      const id = hashId();
      if (!id) return;
      setOpenIds((prev) => new Set(prev).add(id));
      // The entry grows after the browser's own jump, so scroll again.
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader title="Handbook" sub="What each part trains, and how to practise it." />

      <nav
        aria-label="Handbook contents"
        data-testid="handbook-contents"
        className="sticky top-0 z-10 -mx-4 flex gap-x-4 overflow-x-auto border-b border-border bg-background px-4 py-2.5 text-meta whitespace-nowrap sm:-mx-6 sm:flex-wrap sm:gap-y-1 sm:px-6 sm:whitespace-normal"
      >
        {HANDBOOK_ENTRIES.map((e) => (
          <a
            key={e.id}
            href={`#${e.id}`}
            onClick={() => setOpenIds((prev) => new Set(prev).add(e.id))}
            className={
              openIds.has(e.id)
                ? "shrink-0 font-medium text-foreground"
                : "shrink-0 text-muted-foreground hover:text-foreground active:text-foreground"
            }
          >
            {e.title}
          </a>
        ))}
        <a href="#shortcuts" className="shrink-0 text-muted-foreground hover:text-foreground active:text-foreground">
          {HANDBOOK_SHORTCUTS.title}
        </a>
      </nav>

      <Card data-testid="handbook-start">
        <CardHeader className="pb-3">
          <CardTitle className="text-body">{HANDBOOK_START.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-body leading-relaxed">
          <ol className="list-decimal space-y-1 pl-5">
            {HANDBOOK_START.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="text-muted-foreground">{HANDBOOK_START.rhythm}</p>
        </CardContent>
      </Card>

      {HANDBOOK_GROUPS.map((g) => (
        <section key={g.id}>
          <h2 className="mb-3 text-lead font-semibold tracking-tight">{g.title}</h2>
          <div className="-mx-4 border-b border-border sm:mx-0 sm:rounded-lg sm:border-x sm:bg-card">
            {HANDBOOK_ENTRIES.filter((e) => e.group === g.id).map((e) => (
              <EntryRow key={e.id} entry={e} open={openIds.has(e.id)} onToggle={() => toggle(e.id)} />
            ))}
          </div>
        </section>
      ))}

      <section id="shortcuts" className="scroll-mt-16" data-testid="handbook-shortcuts">
        <h2 className="mb-3 text-lead font-semibold tracking-tight">{HANDBOOK_SHORTCUTS.title}</h2>
        <dl className="space-y-2 text-body leading-relaxed">
          {HANDBOOK_SHORTCUTS.rows.map((r) => (
            <div key={r.action} className="grid gap-0.5 sm:grid-cols-[9rem_1fr]">
              <dt className="text-foreground">{r.keys}</dt>
              <dd className="text-muted-foreground">{r.action}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
