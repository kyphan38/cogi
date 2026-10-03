"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVEL_LABELS, PRACTICE_LEVELS } from "@/lib/exercise/levels";
import { HANDBOOK_ENTRIES, HANDBOOK_GROUPS, HANDBOOK_START, type HandbookEntry } from "@/lib/handbook/content";

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function EntryCard({ entry }: { entry: HandbookEntry }) {
  return (
    <Card id={entry.id} className="scroll-mt-20" data-testid="handbook-entry">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-base">{entry.title}</CardTitle>
          <Link href={entry.href} className="text-xs underline underline-offset-4">
            Open
          </Link>
        </div>
        <p className="text-muted-foreground text-sm">{entry.trains}</p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed">
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
      </CardContent>
    </Card>
  );
}

/** Handbook: what each feature trains, what you get, and how to practise. */
export default function HandbookPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Handbook</h1>
        <p className="text-muted-foreground text-sm">
          What each part of the app trains, what you get from it, and how to practise. Come back whenever you forget.
        </p>
      </div>

      <nav aria-label="Handbook contents" className="flex flex-wrap gap-2" data-testid="handbook-contents">
        {HANDBOOK_ENTRIES.map((e) => (
          <a key={e.id} href={`#${e.id}`} className="rounded-full border px-3 py-1 text-xs hover:bg-muted/40">
            {e.title}
          </a>
        ))}
      </nav>

      <Card data-testid="handbook-start">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{HANDBOOK_START.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <ol className="list-decimal space-y-1 pl-5">
            {HANDBOOK_START.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="text-muted-foreground">{HANDBOOK_START.rhythm}</p>
        </CardContent>
      </Card>

      {HANDBOOK_GROUPS.map((g) => (
        <section key={g.id} className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">{g.title}</h2>
          {HANDBOOK_ENTRIES.filter((e) => e.group === g.id).map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </section>
      ))}
    </main>
  );
}
