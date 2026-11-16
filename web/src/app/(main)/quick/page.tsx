"use client";

import Link from "next/link";
import { useState } from "react";

import { QuickFeedbackParts } from "@/components/quick/QuickReview";
import { useQuickQuestion } from "@/components/quick/useQuickQuestion";
import { useSpeakRecorder } from "@/components/quick/useSpeakRecorder";
import { PageHeader } from "@/components/shared/PageHeader";
import { WORD_LINK } from "@/components/shared/Section";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QUICK_ANSWER_MAX, QUICK_SPEAK_MAX_MS } from "@/lib/quick/schema";

const WORD = WORD_LINK.replace("text-meta", "text-body");
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** The 5-minute question: one situation, one question, a short answer, one feedback. */
export default function QuickPage() {
  const q = useQuickQuestion();
  const [answer, setAnswer] = useState("");
  const rec = useSpeakRecorder(QUICK_SPEAK_MAX_MS, (spoken) => void q.finish({ spoken }));
  const busy = q.sending || rec.recording;

  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-8 px-4 pt-8 pb-24 sm:px-6">
      <PageHeader title="5-minute question" sub="One question. A short answer. One feedback." />

      {q.loading ? (
        <p className="text-body text-muted-foreground" role="status">
          thinking
        </p>
      ) : null}

      {q.question ? (
        <section className="space-y-3" data-testid="quick-question">
          <p className="section-label">{q.question.title}</p>
          <p className="text-body leading-[1.75]">{q.question.scenario}</p>
          <p className="text-lead">{q.question.question}</p>
        </section>
      ) : null}

      {q.error || rec.error ? (
        <p className="text-body font-medium text-foreground" role="alert">
          {q.error ?? rec.error}
        </p>
      ) : null}

      {!q.loading && !q.question ? (
        <div>
          <Button type="button" onClick={q.another}>
            Try again
          </Button>
        </div>
      ) : null}

      {q.question && !q.done ? (
        <section className="space-y-3">
          <Label htmlFor="quick-answer">Your answer</Label>
          <Textarea
            id="quick-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={QUICK_ANSWER_MAX}
            rows={4}
            placeholder="Two to four sentences. Say what you think, and why."
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Button type="button" onClick={() => void q.finish({ text: answer })} disabled={busy || answer.trim().length < 10}>
              {q.sending ? "Reading…" : "Get feedback"}
            </Button>
            {rec.recording ? (
              <button type="button" className="text-body font-medium text-foreground" onClick={rec.stop} data-testid="quick-stop">
                Stop · <span className="tabular-nums">{clock(rec.seconds)}</span> of {clock(QUICK_SPEAK_MAX_MS / 1000)}
              </button>
            ) : (
              <button type="button" className={WORD} onClick={() => void rec.start()} disabled={q.sending} data-testid="quick-speak">
                Speak
              </button>
            )}
            <button
              type="button"
              className={WORD}
              disabled={busy}
              onClick={() => {
                setAnswer("");
                q.another();
              }}
            >
              another question
            </button>
          </div>
          <p className="text-meta text-muted-foreground">Speak: answer out loud in English, up to 90 seconds. The recording is not kept.</p>
        </section>
      ) : null}

      {q.done ? (
        <section className="fade-in space-y-6">
          <div>
            <h2 className="mb-1 text-body font-medium">{q.done.spoken ? "What you said" : "Your answer"}</h2>
            <p className="whitespace-pre-wrap text-body leading-relaxed text-muted-foreground" data-testid="quick-answer-shown">
              {q.done.answer}
            </p>
          </div>
          <QuickFeedbackParts row={q.done} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/" className={buttonVariants()}>
              Done
            </Link>
            <button
              type="button"
              className={WORD}
              onClick={() => {
                setAnswer("");
                q.another();
              }}
            >
              another question
            </button>
            <span className="text-meta text-muted-foreground">Saved to History.</span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
