"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCompletedExercises, listIncompleteExercises } from "@/lib/db/exercises";
import { logFirestoreQueryError } from "@/lib/db/firestore";
import { collectTerms, type LearnedTerm } from "@/lib/exercise/terms";
import { getTermReviewStates } from "@/lib/db/term-review";
import { dueTerms, termStatus, type TermReviewStates } from "@/lib/exercise/term-review";
import { localDay, type ReviewStatus } from "@/lib/review/schedule";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";

const STATUS_LABEL: Record<ReviewStatus, string> = { due: "Due", learning: "Learning", known: "Known" };

/** "My terms": every idea met in "Learn first", to look back over (PLAN-learning.md). */
export default function TermsPage() {
  const [terms, setTerms] = useState<LearnedTerm[] | null>(null);
  const [query, setQuery] = useState("");
  const [states, setStates] = useState<TermReviewStates>({});
  const [today] = useState(() => localDay(new Date()));

  useEffect(() => {
    void (async () => {
      try {
        const [done, open, saved] = await Promise.all([
          listCompletedExercises(),
          listIncompleteExercises(),
          getTermReviewStates(),
        ]);
        setStates(saved);
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

  const due = terms ? dueTerms(terms, states, today).length : 0;

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-12 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader
        title="My terms"
        sub={<>From &ldquo;Learn first&rdquo;. Review before your next exercise.</>}
      />
      {due > 0 ? (
        <Link href="/terms/review" className={cn(buttonVariants(), "self-start")} data-testid="terms-review-link">
          Review {Math.min(due, 5)} {due === 1 ? "term" : "terms"}
        </Link>
      ) : null}
      {terms && terms.length > 0 ? (
        <Input aria-label="Search terms" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      ) : null}
      {terms === null ? (
        <p className="text-muted-foreground text-body">Loading…</p>
      ) : terms.length === 0 ? (
        <p className="text-muted-foreground text-body italic">
          No terms yet. Do a Life situations exercise to collect your first ones.
        </p>
      ) : (
        <ul className="space-y-3" data-testid="terms-list">
          {shown.map((t) => (
            <li key={t.term}>
              <Card>
                <CardContent className="space-y-1 pt-5 text-body">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground font-medium">{t.term}</span>
                    <span className="text-muted-foreground shrink-0 text-meta" data-testid="term-status">
                      {STATUS_LABEL[termStatus(t, states, today)]}
                    </span>
                  </p>
                  <p>{t.plain}</p>
                  <p className="text-muted-foreground">Example: {t.example}</p>
                  <p className="text-muted-foreground text-meta">
                    Seen in:{" "}
                    {t.seenIn.slice(0, 3).map((s, i) => (
                      <span key={s.id}>
                        {i > 0 ? ", " : ""}
                        <Link className="font-medium text-foreground" href={`/exercise/history?openExercise=${encodeURIComponent(s.id)}`}>
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
