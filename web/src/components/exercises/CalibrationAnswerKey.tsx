"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coaching, CoachingFooter, Row, Section, Stat } from "@/components/shared/AnswerKeyParts";
import { TakeWithYouCards } from "@/components/shared/TakeWithYouCards";
import { CALIBRATION_IDEA_GUIDE, CALIBRATION_IDEA_NAMES } from "@/lib/exercise/calibration-idea-guide";
import { pickCalibrationCards } from "@/lib/exercise/calibration-idea-cards";

const CARD_LABELS = { self: "When it's you", elsewhere: "Same idea, other place", balanced: "Better calibrated" };
import type { CalibrationExerciseRow } from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";
import type { CalibrationResult } from "@/lib/exercise/calibration-score";

const fmt = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Calibration results: how sure vs how right, each question with its checked answer
 * and source, and the AI's coaching. Few questions per exercise, so the numbers here
 * are a snapshot; History shows the picture over many exercises.
 */
export function CalibrationAnswerKey({
  exercise,
  result,
  coaching,
}: {
  exercise: Pick<CalibrationExerciseRow, "items" | "answers">;
  result: CalibrationResult;
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
}) {
  const items = useMemo(() => new Map((coaching?.items ?? []).map((it) => [it.ref, it])), [coaching]);
  const answers = exercise.answers ?? {};
  const r = result;
  const hitRate = r.interval.count > 0 ? Math.round((r.interval.hits / r.interval.count) * 100) : null;

  return (
    <Card data-testid="calibration-answer-key">
      <CardHeader>
        <CardTitle className="text-lg">How sure vs how right</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {r.binary.count > 0 ? <Stat label="Two-answer questions right" value={`${r.binary.right}/${r.binary.count}`} /> : null}
          {r.binary.brier != null ? <Stat label="Brier score (lower is better)" value={r.binary.brier.toFixed(2)} /> : null}
          {hitRate != null ? (
            <Stat label={`Ranges that held the answer (aim: ${r.interval.target}%)`} value={`${r.interval.hits}/${r.interval.count}`} />
          ) : null}
          <Stat label="Base rates close enough" value={`${r.baseRate.right}/${r.baseRate.count}`} />
        </div>
        <p className="text-muted-foreground">
          {r.binary.brier != null ? "A Brier score of 0.25 is what you get by always saying 50%. " : null}
          One exercise has only a few questions, so treat these numbers as a hint, not a verdict.
        </p>

        {r.binary.buckets.length > 0 ? (
          <section className="space-y-2" data-testid="confidence-table">
            <h3 className="text-foreground font-semibold">When you said...</h3>
            <table className="w-full max-w-sm text-left text-sm tabular-nums">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th className="py-1 font-normal">How sure</th>
                  <th className="py-1 font-normal">Answers</th>
                  <th className="py-1 font-normal">Right</th>
                </tr>
              </thead>
              <tbody>
                {r.binary.buckets.map((bk) => (
                  <tr key={bk.confidence} className="border-muted border-t">
                    <td className="py-1">{bk.confidence}%</td>
                    <td className="py-1">{bk.count}</td>
                    <td className="py-1">
                      {bk.right} ({Math.round((bk.right / bk.count) * 100)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {items.get("pattern") ? (
          <section className="space-y-1">
            <h3 className="text-foreground font-semibold">The overall picture</h3>
            <Coaching item={items.get("pattern")} fallback="" />
          </section>
        ) : null}

        <Section title="Questions">
          {exercise.items.map((item, i) => {
            const o = r.items.find((x) => x.id === item.id)!;
            const a = answers[item.id] ?? {};
            const coach = items.get(`item_${item.id}`);
            if (item.kind === "binary") {
              return (
                <Row
                  key={item.id}
                  marker={String(i + 1)}
                  status={o.correct ? "right" : "wrong"}
                  heading={item.seenBefore ? `${item.question} (seen before)` : item.question}
                  aside={a.choice != null ? `You: ${item.options[a.choice]} · ${a.confidence}% sure` : "Not answered"}
                >
                  <p>
                    <span className="text-foreground font-medium">Answer: </span>
                    {item.options[item.answerIndex]}
                  </p>
                  <Coaching item={coach} fallback={item.explanation} />
                  <p className="text-muted-foreground text-xs">Source: {item.source}</p>
                </Row>
              );
            }
            if (item.kind === "interval") {
              return (
                <Row
                  key={item.id}
                  marker={String(i + 1)}
                  status={o.correct ? "right" : "wrong"}
                  heading={item.seenBefore ? `${item.question} (seen before)` : item.question}
                  aside={a.low != null && a.high != null ? `You: ${fmt(Math.min(a.low, a.high))} to ${fmt(Math.max(a.low, a.high))}` : "Not answered"}
                >
                  <p>
                    <span className="text-foreground font-medium">Answer: </span>
                    {item.unit === "$" ? `$${fmt(item.answer)}` : `${fmt(item.answer)} ${item.unit}`}
                    {o.correct ? " - inside your range." : o.missed === "too-low" ? " - your range was too low." : " - your range was too high."}
                  </p>
                  {o.veryWide ? (
                    <p className="text-muted-foreground">Very wide: the high end is more than 10 times the low end.</p>
                  ) : null}
                  <Coaching item={coach} fallback={item.explanation} />
                  <p className="text-muted-foreground text-xs">Source: {item.source}</p>
                </Row>
              );
            }
            return (
              <Row
                key={item.id}
                marker={String(i + 1)}
                status={o.correct ? "right" : "wrong"}
                heading={`Base rate: ${item.question}`}
                aside={a.estimate != null ? `You: ${fmt(a.estimate)}%` : "Not answered"}
              >
                <p className="text-muted-foreground">{item.story}</p>
                <p>
                  <span className="text-foreground font-medium">Answer: </span>about {item.answer}%
                </p>
                <p>{item.explanation}</p>
                <Coaching item={coach} fallback="" />
              </Row>
            );
          })}
        </Section>

        <CoachingFooter coaching={coaching} metaTitle="One more thing" />
        <TakeWithYouCards
          entries={pickCalibrationCards(r).map((k) => ({ key: k, name: CALIBRATION_IDEA_NAMES[k], guide: CALIBRATION_IDEA_GUIDE[k] }))}
          cards={coaching?.trapCards}
          labels={CARD_LABELS}
        />
      </CardContent>
    </Card>
  );
}
