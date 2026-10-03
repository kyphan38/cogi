"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coaching, CoachingFooter, Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import type { JudgmentExerciseRow } from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";
import type { JudgmentResult } from "@/lib/exercise/judgment-score";
import { LENS_INFO } from "@/lib/exercise/judgment-levels";

/**
 * Life-situation results: the user's order next to the expert's, each lens, and the
 * user's own response, with the AI's coaching. The expert view is a reference, so rows
 * say "same / close / far", never "wrong".
 */
export function JudgmentAnswerKey({
  exercise,
  result,
  coaching,
}: {
  exercise: Pick<
    JudgmentExerciseRow,
    "responses" | "lensQuestions" | "lensAnswers" | "lensText" | "ownResponse" | "confidenceBefore"
  >;
  result: JudgmentResult;
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
}) {
  const items = useMemo(() => new Map((coaching?.items ?? []).map((it) => [it.ref, it])), [coaching]);
  const byExpert = [...exercise.responses].sort((a, b) => a.expertRank - b.expertRank);
  const n = exercise.responses.length;
  const lensesChecked = result.lenses.filter((l) => l.correct !== null);

  return (
    <Card data-testid="judgment-answer-key">
      <CardHeader>
        <CardTitle className="text-lg">Compared with an expert</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Same best response" value={result.topMatch ? "Yes" : "No"} />
          <Stat label="Order close" value={`${Math.round(result.closeness * 100)}%`} />
          <Stat
            label="Lenses matched"
            value={
              lensesChecked.length > 0
                ? `${lensesChecked.filter((l) => l.correct).length}/${lensesChecked.length}`
                : "Written"
            }
          />
        </div>
        <p className="text-muted-foreground">
          There is no single right answer to a real situation. The expert order is a reasoned reference to
          learn from.
        </p>

        <Section title="Ways to respond" hint="In the expert's order, best first.">
          {byExpert.map((resp) => {
            const row = result.responses.find((x) => x.id === resp.id)!;
            const gap = Math.abs(row.userRank - row.expertRank);
            const status: Status = gap === 0 ? "right" : gap === 1 ? "partly" : "wrong";
            return (
              <Row
                key={resp.id}
                status={status}
                heading={resp.text}
                aside={`You #${row.userRank} · expert #${row.expertRank} of ${n}`}
              >
                <Coaching item={items.get(`response_${resp.id}`)} fallback={resp.why} />
              </Row>
            );
          })}
        </Section>

        <Section title="Three lenses">
          {exercise.lensQuestions.map((q) => {
            const l = result.lenses.find((x) => x.lens === q.lens)!;
            const status: Status = l.correct === null ? "neutral" : l.correct ? "right" : "partly";
            const yours =
              l.correct === null
                ? exercise.lensText?.[q.lens]?.trim()
                : q.options[exercise.lensAnswers?.[q.lens] ?? -1];
            return (
              <Row key={q.lens} status={status} heading={LENS_INFO[q.lens].name} aside={q.question}>
                {yours && !l.correct ? <p className="text-muted-foreground">You: {yours}</p> : null}
                <p>
                  <span className="text-foreground font-medium">Most useful reading: </span>
                  {q.options[q.answerIndex]}
                </p>
                <Coaching item={items.get(`lens_${q.lens}`)} fallback={q.explanation} />
              </Row>
            );
          })}
        </Section>

        {exercise.ownResponse?.trim() ? (
          <Section title="Your own response">
            <Row status="neutral" heading="What you would do" quote={exercise.ownResponse.trim()}>
              <Coaching item={items.get("own")} fallback="" />
            </Row>
          </Section>
        ) : null}

        <CoachingFooter coaching={coaching} metaTitle="Your reason" />
      </CardContent>
    </Card>
  );
}
