"use client";

import { useEffect, useState } from "react";

import { Section, WORD_LINK } from "@/components/shared/Section";
import { Button } from "@/components/ui/button";
import { aiFetch, safeAiJson } from "@/lib/api/ai-fetch";
import { getMonthlyReviews, saveMonthlyReview } from "@/lib/db/monthly-reviews";
import { monthLabel, monthStats, monthToReview, TREND_WORD, type MonthlyReview, type MonthlyReviewText } from "@/lib/monthly/stats";
import { localDay } from "@/lib/review/schedule";
import type { Exercise } from "@/lib/types/exercise";

function Items({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 font-medium">{title}</h3>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

function ReviewBody({ review }: { review: MonthlyReview }) {
  const { stats, text } = review;
  return (
    <div className="space-y-4 text-body leading-relaxed" data-testid="monthly-review">
      <p className="text-lead">{text.headline}</p>
      <table className="w-full text-left tabular-nums">
        <thead className="text-meta text-muted-foreground">
          <tr>
            <th className="py-1 font-normal">Type</th>
            <th className="py-1 font-normal">Done</th>
            <th className="py-1 font-normal">Score</th>
            <th className="py-1 font-normal">Month before</th>
            <th className="py-1 font-normal">Trend</th>
          </tr>
        </thead>
        <tbody>
          {stats.types.map((t) => (
            <tr key={t.type} className="border-t border-border">
              <td className="py-1">{t.label}</td>
              <td className="py-1">{t.count}</td>
              <td className="py-1">{t.score ?? "-"}</td>
              <td className="py-1">{t.prevScore ?? "-"}</td>
              <td className={t.trend === "up" || t.trend === "down" ? "py-1 font-medium" : "py-1 text-muted-foreground"}>
                {t.trend ? TREND_WORD[t.trend] : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Items title="Went up" items={text.improved} />
      <Items title="Stayed the same" items={text.steady} />
      <div>
        <h3 className="mb-1 font-medium">Next month</h3>
        <p>{text.focus}</p>
      </div>
    </div>
  );
}

/**
 * History: a review of the last full month, written on request. Saved reviews stay,
 * and older months open with a word.
 */
export function MonthlyReviewSection({ completed }: { completed: Exercise[] }) {
  const [reviews, setReviews] = useState<MonthlyReview[] | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMonthlyReviews()
      .then((r) => {
        if (!cancelled) setReviews(r);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!reviews) return null;
  const due = monthToReview(completed, reviews, localDay(new Date()));
  if (!due && reviews.length === 0) return null;
  const shown = reviews.find((r) => r.month === openMonth) ?? reviews[0];

  const write = async () => {
    if (!due || writing) return;
    setWriting(true);
    setError(null);
    try {
      const stats = monthStats(completed, due);
      const res = await aiFetch("/api/ai/monthly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
      });
      const json = await safeAiJson<{ ok: true; text: MonthlyReviewText } | { ok: false; error: string }>(res);
      if (!json.ok) throw new Error(json.error);
      setReviews(await saveMonthlyReview({ month: due, createdAt: new Date().toISOString(), stats, text: json.text }));
      setOpenMonth(due);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the review.");
    } finally {
      setWriting(false);
    }
  };

  return (
    <Section title="Monthly review" data-testid="monthly-review-section">
      <div className="space-y-4">
        {due ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button type="button" onClick={() => void write()} disabled={writing} data-testid="monthly-review-write">
              {writing ? "Writing…" : `Write review for ${monthLabel(due)}`}
            </Button>
            {error ? (
              <p className="text-meta font-medium text-foreground" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        {reviews.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-meta">
            {reviews.map((r) => (
              <button
                key={r.month}
                type="button"
                onClick={() => setOpenMonth(r.month)}
                aria-pressed={shown?.month === r.month}
                className={shown?.month === r.month ? "font-medium text-foreground" : WORD_LINK}
              >
                {monthLabel(r.month)}
              </button>
            ))}
          </div>
        ) : null}
        {shown ? <ReviewBody review={shown} /> : null}
      </div>
    </Section>
  );
}
