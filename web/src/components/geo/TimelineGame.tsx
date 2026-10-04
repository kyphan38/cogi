"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfidenceSlider } from "@/components/shared/ConfidenceSlider";
import { RankList } from "@/components/exercises/RankList";
import { ActorCards } from "@/components/geo/ActorCards";
import { TimelineAxis } from "@/components/geo/TimelineAxis";
import { cn } from "@/lib/utils";
import {
  confidenceSummary,
  judgeDecision,
  orderQuizEvents,
  type TimelineAnswer,
  type TimelineCase,
  type TimelineResult,
} from "@/lib/geo/timelines";

/** A fixed, non-chronological starting order for the order question. */
function scrambled<T>(items: T[]): T[] {
  const order = [2, 0, 3, 1, 4, 5].filter((i) => i < items.length);
  return order.map((i) => items[i]!);
}

function SourceLink({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" title={label} aria-label={`Source: ${label}`} className="text-muted-foreground text-xs underline underline-offset-2">
      Source
    </a>
  );
}

/**
 * A timeline with decision points (PLAN-geopolitics.md G4): events appear one at a time;
 * at a decision point the learner chooses and says how sure they are before seeing what
 * really happened. Then: put events in order, and spot the step that calmed the crisis.
 * Choices are compared with history as "close" or "different", never right or wrong.
 */
export function TimelineGame({ timeline, onFinish }: { timeline: TimelineCase; onFinish: (r: TimelineResult) => void }) {
  const { events, decisions } = timeline;
  const [shown, setShown] = useState(0);
  const [answers, setAnswers] = useState<TimelineAnswer[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [lastDecisionId, setLastDecisionId] = useState<string | null>(null);
  /** The result of the last decision stays on screen until the learner continues. */
  const [showingResult, setShowingResult] = useState(false);
  const quizEvents = useMemo(() => orderQuizEvents(timeline), [timeline]);
  const [order, setOrder] = useState<string[]>(() => scrambled(quizEvents).map((e) => e.id));
  const [orderChecked, setOrderChecked] = useState(false);
  const [offRamp, setOffRamp] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const next = events[shown];
  const pending = next ? decisions.find((d) => d.beforeEventId === next.id && !answers.some((a) => a.decisionId === d.id)) : undefined;
  const lastDecision = decisions.find((d) => d.id === lastDecisionId);
  const lastAnswer = answers.find((a) => a.decisionId === lastDecisionId);
  const allShown = shown >= events.length;
  const offRampEvents = events.filter((e) => e.offRamp);
  const rightOrder = [...quizEvents].sort((a, b) => a.date.localeCompare(b.date)).map((e) => e.id);
  const orderCorrect = order.filter((id, i) => rightOrder[i] === id).length;
  const done = allShown && orderChecked;

  const lockIn = () => {
    if (!pending || !choice) return;
    setAnswers((prev) => [...prev, judgeDecision(pending, choice, confidence)]);
    setLastDecisionId(pending.id);
    setShowingResult(true);
    setShown((n) => n + 1);
    setChoice(null);
    setConfidence(50);
  };

  const finish = (picked: string | null) => {
    if (isFinished) return;
    setIsFinished(true);
    onFinish({
      caseId: timeline.id,
      answers,
      orderCorrect,
      orderTotal: quizEvents.length,
      offRampPicked: picked,
      offRampCorrect: offRampEvents.length ? offRampEvents.some((e) => e.id === picked) : null,
    });
  };

  const summary = confidenceSummary(answers);

  return (
    <div className="space-y-4" data-testid="timeline-game">
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-zinc-900">
          {timeline.title} <span className="text-muted-foreground font-normal">({timeline.when})</span>
        </h2>
        <p className="text-sm">{timeline.intro}</p>
        <p className="text-muted-foreground text-xs">
          History has no single right answer. Your choices are compared with what really happened: close or different.
        </p>
      </div>

      <TimelineAxis events={events} shown={shown} currentId={events[shown - 1]?.id} />

      <ol className="space-y-2 border-l-2 border-zinc-200 pl-4" data-testid="timeline-events">
        {events.slice(0, shown).map((e) => (
          <li key={e.id} className="relative text-sm" data-testid="timeline-event">
            <span className="absolute top-1.5 -left-[calc(1rem+6px)] size-2.5 rounded-full border-2 border-white bg-zinc-900" aria-hidden />
            <p className="text-muted-foreground text-xs">{e.dateLabel}</p>
            <p>
              {e.text} <SourceLink url={e.source.url} label={e.source.label} />
            </p>
          </li>
        ))}
      </ol>

      {lastDecision && lastAnswer && showingResult ? (
        <div className="space-y-1 rounded-xl border border-zinc-200 bg-white p-3 text-sm" data-testid="decision-result" data-verdict={lastAnswer.verdict}>
          <p className="flex items-center gap-1.5 font-medium text-zinc-900">
            {lastAnswer.verdict === "close" ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
            {lastAnswer.verdict === "close" ? "Close to what really happened." : "Different from what really happened."}
          </p>
          <p>
            What happened: {lastDecision.options.find((o) => o.id === lastDecision.realOptionId)?.text}.
          </p>
          <p>
            {lastDecision.consequence} <SourceLink url={lastDecision.source.url} label={lastDecision.source.label} />
          </p>
          <Button type="button" size="sm" onClick={() => setShowingResult(false)} data-testid="decision-continue">
            Continue
          </Button>
        </div>
      ) : null}

      {showingResult ? null : pending ? (
        <div className="space-y-3 rounded-xl border border-zinc-900 bg-white p-3" data-testid="decision-point">
          <p className="text-muted-foreground text-xs uppercase">Your decision</p>
          <p className="text-sm">{pending.role}</p>
          <p className="text-sm font-medium text-zinc-900">{pending.question}</p>
          <div className="grid gap-2" role="radiogroup" aria-label={pending.question}>
            {pending.options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={choice === o.id}
                onClick={() => setChoice(o.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  choice === o.id ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50",
                )}
              >
                {o.text}
              </button>
            ))}
          </div>
          <ConfidenceSlider value={confidence} onChange={setConfidence} label="How sure are you that this is what they did?" />
          <Button type="button" disabled={!choice} onClick={lockIn} data-testid="decision-lock">
            Lock in and see what happened
          </Button>
        </div>
      ) : !allShown ? (
        <Button type="button" onClick={() => setShown((n) => n + 1)} data-testid="timeline-next">
          {shown === 0 ? "Start the timeline" : "Next event"}
        </Button>
      ) : null}

      {allShown && !showingResult ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3" data-testid="order-question">
          <p className="text-sm font-medium text-zinc-900">Put these events in order, earliest at the top.</p>
          <RankList
            items={quizEvents.map((e) => ({ id: e.id, text: orderChecked ? `${e.text} (${e.dateLabel})` : e.text }))}
            order={order}
            onChange={orderChecked ? () => {} : setOrder}
          />
          {orderChecked ? (
            <p className="text-sm" data-testid="order-result">
              {orderCorrect} of {quizEvents.length} in the right place. The right order:{" "}
              {rightOrder.map((id) => quizEvents.find((e) => e.id === id)!.dateLabel).join(", then ")}.
            </p>
          ) : (
            <Button type="button" onClick={() => setOrderChecked(true)} data-testid="order-check">
              Check the order
            </Button>
          )}
        </div>
      ) : null}

      {allShown && orderChecked && offRampEvents.length ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3" data-testid="offramp-question">
          <p className="text-sm font-medium text-zinc-900">Which step calmed the crisis? (an &quot;off-ramp&quot;: a way down from the danger)</p>
          <div className="grid gap-2" role="radiogroup" aria-label="Which step calmed the crisis?">
            {events.map((e) => {
              const isAnswer = offRamp != null && e.offRamp;
              const picked = offRamp === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  role="radio"
                  aria-checked={picked}
                  disabled={offRamp != null}
                  onClick={() => {
                    setOffRamp(e.id);
                    finish(e.id);
                  }}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-default",
                    isAnswer ? "border-zinc-900 bg-zinc-50" : picked ? "border-zinc-400" : "border-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  {isAnswer ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                  {picked && !isAnswer ? <X className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
                  <span>
                    <span className="text-muted-foreground block text-xs">{e.dateLabel}</span>
                    {e.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {allShown && orderChecked && !offRampEvents.length && !isFinished ? (
        <Button type="button" onClick={() => finish(null)} data-testid="timeline-finish">
          See my summary
        </Button>
      ) : null}

      {done && isFinished && summary ? (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm" data-testid="timeline-summary">
          <p className="font-medium text-zinc-900">Your summary</p>
          <p>
            Your choices were close to history {answers.filter((a) => a.verdict === "close").length} of {answers.length} times.
          </p>
          <p data-testid="timeline-calibration">
            You were {summary.avgConfidence}% sure on average, and close {summary.closeRate}% of the time.{" "}
            {Math.abs(summary.avgConfidence - summary.closeRate) <= 15
              ? "Your confidence matched your results well."
              : summary.avgConfidence > summary.closeRate
                ? "You were more sure than your results showed."
                : "You were less sure than your results showed."}
          </p>
          {timeline.actorIds.length ? (
            <details className="space-y-2">
              <summary className="cursor-pointer font-medium text-zinc-900">Use the cards: the players today</summary>
              <div className="mt-2">
                <ActorCards ids={timeline.actorIds} />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
