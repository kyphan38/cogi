"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coaching, CoachingFooter, Row, Section, Stat, type Status } from "@/components/shared/AnswerKeyParts";
import type { EvaluativeExerciseRow } from "@/lib/types/exercise";
import type { AnalyticalCoachingStructured, CoachingStructured } from "@/lib/types/perspective";
import { BIG_GAP, quadrantName, type EvaluativeResult } from "@/lib/exercise/evaluative-score";

/**
 * Evaluative results after feedback. Matrix placements have a model answer; weights,
 * scores and chances are judgment calls, so those rows say "close" or "different",
 * never "wrong". Comparisons come from `result` (code); the AI text only explains.
 */
export function EvaluativeAnswerKey({
  exercise,
  result,
  coaching,
}: {
  exercise: EvaluativeExerciseRow;
  result: EvaluativeResult;
  coaching: AnalyticalCoachingStructured | CoachingStructured | null;
}) {
  const items = useMemo(() => new Map((coaching?.items ?? []).map((it) => [it.ref, it])), [coaching]);
  const optionTitle = (id: string) => exercise.options.find((o) => o.id === id)?.title ?? id;
  const ranking = (ids: string[]) => (ids.length ? ids.map(optionTitle).join(" > ") : "-");

  return (
    <Card data-testid="evaluative-answer-key">
      <CardHeader>
        <CardTitle className="text-lg">Compared with the model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed">
        {result.variant === "matrix" && exercise.variant === "matrix" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Same quadrant" value={`${result.correct}/${result.total}`} />
              <Stat label="Your confidence" value={exercise.confidenceBefore != null ? `${exercise.confidenceBefore}%` : "-"} />
            </div>
            <Section title="Your placements" hint={`${exercise.axisX.label} across, ${exercise.axisY.label} up.`}>
              {result.placements.map((p) => {
                const o = exercise.options.find((x) => x.id === p.optionId)!;
                const status: Status = p.correct ? "right" : "wrong";
                return (
                  <Row key={p.optionId} status={status} heading={o.title} aside={p.correct ? "Same as the model" : undefined}>
                    {!p.correct ? (
                      <p className="text-muted-foreground">
                        You: {p.user ? quadrantName(p.user, exercise.axisX, exercise.axisY) : "not placed"}. Model:{" "}
                        {quadrantName(p.intended, exercise.axisX, exercise.axisY)}.
                      </p>
                    ) : null}
                    <Coaching item={items.get(`option_${o.id}`)} fallback={o.explanation} />
                  </Row>
                );
              })}
            </Section>
          </>
        ) : null}

        {result.variant === "scoring" && exercise.variant === "scoring" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Same best option" value={result.topMatch ? "Yes" : "No"} />
              <Stat
                label="Big weight gaps"
                value={String(result.criteria.filter((c) => Math.abs(c.gap) >= BIG_GAP).length)}
              />
            </div>
            <p className="text-muted-foreground">
              Your ranking: {ranking(result.userOrder)}. Model: {ranking(result.modelOrder)}. The model is a reference.
            </p>
            <Section title="Criteria">
              {result.criteria.map((c) => {
                const crit = exercise.criteria.find((x) => x.id === c.criterionId)!;
                const cells = result.bigCells.filter((cell) => cell.criterionId === c.criterionId);
                const close = Math.abs(c.gap) < BIG_GAP && cells.length === 0;
                return (
                  <Row
                    key={c.criterionId}
                    status={close ? "right" : "partly"}
                    heading={`${crit.label}${crit.isDealbreaker ? " (dealbreaker)" : ""}`}
                    aside={`You ${c.userWeight}/5 · model ${c.modelWeight}/5`}
                  >
                    {cells.length > 0 ? (
                      <p className="text-muted-foreground">
                        Scores far apart:{" "}
                        {cells.map((cell) => `${optionTitle(cell.optionId)} (you ${cell.user}, model ${cell.model})`).join("; ")}
                      </p>
                    ) : null}
                    <Coaching item={items.get(`criterion_${crit.id}`)} fallback={crit.description} />
                  </Row>
                );
              })}
            </Section>
          </>
        ) : null}

        {result.variant === "uncertainty" && exercise.variant === "uncertainty" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Same best option" value={result.topMatch ? "Yes" : "No"} />
              <Stat label="Your confidence" value={exercise.confidenceBefore != null ? `${exercise.confidenceBefore}%` : "-"} />
            </div>
            <p className="text-muted-foreground">
              Your ranking by expected value: {ranking(result.userOrder)}. Model: {ranking(result.modelOrder)}.
            </p>
            <Section title="Options">
              {result.options.map((r) => {
                const o = exercise.options.find((x) => x.id === r.optionId)!;
                const close =
                  r.userEv != null && r.modelEv != null && Math.abs(r.userEv - r.modelEv) <= Math.max(1, Math.abs(r.modelEv) * 0.1);
                return (
                  <Row
                    key={r.optionId}
                    status={close ? "right" : "partly"}
                    heading={o.title}
                    aside={`You ${r.userEv ?? "-"} · model ${r.modelEv ?? "-"}`}
                  >
                    <Coaching item={items.get(`option_${o.id}`)} fallback={o.description} />
                  </Row>
                );
              })}
            </Section>
          </>
        ) : null}

        <CoachingFooter coaching={coaching} metaTitle="Your criteria" />
      </CardContent>
    </Card>
  );
}
