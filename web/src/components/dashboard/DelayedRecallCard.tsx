"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineSpinner } from "@/components/ui/inline-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { DelayedRecallQueueRow } from "@/lib/types/insights";
import { aiFetch } from "@/lib/api/ai-fetch";
import { getExercise } from "@/lib/db/exercises";
import { exerciseSummaryForReview } from "@/lib/insights/build-weekly-review-payload";
import { updateRecallRow } from "@/lib/db/delayed-recall";
import type { Exercise } from "@/lib/types/exercise";

export interface DelayedRecallCardProps {
  recall: DelayedRecallQueueRow;
}

export function DelayedRecallCard({ recall }: DelayedRecallCardProps) {
  const [answer, setAnswer] = useState("");
  const [submittedFeedback, setSubmittedFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dismiss = async () => {
    setError(null);
    const now = new Date().toISOString();
    await updateRecallRow({
      ...recall,
      status: "dismissed",
      dismissedAt: now,
    });
  };

  const submit = async () => {
    const t = answer.trim();
    if (t.length < 3) {
      setError("Write at least a few words.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ex = await getExercise(recall.exerciseId);
      const summary = ex ? exerciseSummaryForReview(ex as Exercise) : recall.exerciseTitle;
      const requestId = crypto.randomUUID();
      const res = await aiFetch("/api/ai/recall-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          exerciseId: recall.exerciseId,
          exerciseTitle: recall.exerciseTitle,
          summary,
          userRecall: t,
        }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            text: string;
            saved?: { saved: true; id: string; path: string; savedAt: string };
          }
        | { ok: false; error: string };
      if (!json.ok) {
        setError(json.error);
        return;
      }
      const now = new Date().toISOString();
      await updateRecallRow({
        ...recall,
        status: "answered",
        userAnswer: t,
        feedbackText: json.text,
        answeredAt: now,
      });
      setSubmittedFeedback(json.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (submittedFeedback) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recall feedback</CardTitle>
          <CardDescription className="text-xs">{recall.exerciseTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">{submittedFeedback}</p>
          <p className="text-muted-foreground text-xs italic">
            When the next recall is due, it will replace this card automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm">Quick recall</CardTitle>
          <CardDescription className="text-xs">
            {recall.exerciseTitle} — What was the main insight?
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground"
          onClick={() => void dismiss()}
          aria-label="Dismiss recall"
        >
          ✕
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
        <Textarea
          rows={3}
          placeholder="One or two sentences…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="text-sm"
        />
        <Button type="button" size="sm" disabled={loading} onClick={() => void submit()}>
          {loading ? (
            <>
              <InlineSpinner /> Submitting…
            </>
          ) : (
            "Submit"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
