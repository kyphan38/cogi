"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCompletedExercises, listIncompleteExercises } from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { collectTerms, type LearnedTerm } from "@/lib/exercise/terms";

/** "My terms": every idea met in "Learn first", to look back over (PLAN-learning.md). */
export default function TermsPage() {
  const [terms, setTerms] = useState<LearnedTerm[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const [done, open] = await Promise.all([listCompletedExercises(), listIncompleteExercises()]);
        setTerms(collectTerms([...done, ...open]));
      } catch (e) {
        logFirestoreQueryError("TermsPage", "listExercises", e);
        setTerms([]);
      }
    })();
  }, []);

  const q = query.trim().toLowerCase();
  const shown = (terms ?? []).filter(
    (t) => !q || t.term.toLowerCase().includes(q) || t.plain.toLowerCase().includes(q),
  );

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">My terms</h1>
        <p className="text-muted-foreground text-sm">
          From &ldquo;Learn first&rdquo;. Review before your next exercise.
        </p>
      </div>
      {terms && terms.length > 0 ? (
        <Input aria-label="Search terms" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      ) : null}
      {terms === null ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : terms.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">
          No terms yet. Do a Life situations exercise to collect your first ones.
        </p>
      ) : (
        <ul className="space-y-3" data-testid="terms-list">
          {shown.map((t) => (
            <li key={t.term}>
              <Card>
                <CardContent className="space-y-1 pt-5 text-sm">
                  <p className="text-foreground font-medium">{t.term}</p>
                  <p>{t.plain}</p>
                  <p className="text-muted-foreground">Example: {t.example}</p>
                  <p className="text-muted-foreground text-xs">
                    Seen in:{" "}
                    {t.seenIn.slice(0, 3).map((s, i) => (
                      <span key={s.id}>
                        {i > 0 ? ", " : ""}
                        <Link className="underline underline-offset-2" href={`/exercise/history?openExercise=${encodeURIComponent(s.id)}`}>
                          {s.title}
                        </Link>
                      </span>
                    ))}
                    {t.seenIn.length > 3 ? ` and ${t.seenIn.length - 3} more` : ""}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
